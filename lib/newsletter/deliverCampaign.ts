import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRow } from "@/lib/types/database";
import { getSiteConfig } from "@/lib/seo/site";
import {
  buildEmailHtml,
  newsletterBrandingFromTenant,
  type NewsletterBlock,
  type ArticleLayout,
} from "./buildEmailHtml";
import { enrichArticleBlocksWithAdvertisementFlags } from "./enrichArticleBlocksForEmail";
import {
  sendGridCategoryForCampaign,
  sendGridNewsletterGlobalCategory,
} from "./sendGridCampaign";
import { resolveRecipients, type Recipient } from "./recipients";
import { createNewsletterUnsubscribeToken } from "./unsubscribeToken";

type Campaign = {
  id: string;
  tenant_id: string;
  status: string;
  blocks: NewsletterBlock[];
  subject: string;
  preview_text?: string;
  recipients_type?: string;
  template_id?: string;
};
export async function deliverCampaign(
  db: SupabaseClient,
  campaign: Campaign,
  tenant: TenantRow,
  scheduled: boolean,
) {
  if (campaign.tenant_id !== tenant.id)
    throw new Error("Campaign publication mismatch");
  if (!process.env.SENDGRID_API_KEY)
    throw new Error("Email sending is not configured");
  const { data: claimed, error: claimError } = await db
    .from("newsletter_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaign.id)
    .eq("tenant_id", tenant.id)
    .in(
      "status",
      scheduled ? ["scheduled"] : ["draft", "scheduled", "canceled"],
    )
    .select("id");
  if (claimError) throw new Error(claimError.message);
  if (!claimed?.length)
    throw new Error("Campaign is already sending, sent, or no longer eligible");
  let requestStarted = false;
  try {
    const initialBatches = await db
      .from("newsletter_send_batches")
      .select("batch_index,recipients,status")
      .eq("campaign_id", campaign.id)
      .order("batch_index");
    let batches = initialBatches.data;
    if (initialBatches.error) throw new Error(initialBatches.error.message);
    if (!batches?.length) {
      const recipients = await resolveRecipients(
        db,
        tenant.id,
        campaign.recipients_type || "newsletter",
      );
      if (!recipients.length) throw new Error("No recipients found");
      const pending = [];
      for (let i = 0; i < recipients.length; i += 500)
        pending.push({
          campaign_id: campaign.id,
          batch_index: i / 500,
          recipients: recipients.slice(i, i + 500),
          status: "pending",
        });
      const { error } = await db
        .from("newsletter_send_batches")
        .insert(pending);
      if (error) throw new Error(error.message);
      batches = pending;
    }
    const { siteUrl, siteName } = getSiteConfig(tenant);
    const branding = newsletterBrandingFromTenant(tenant);
    const blocks = await enrichArticleBlocksWithAdvertisementFlags(
      db,
      Array.isArray(campaign.blocks) ? campaign.blocks : [],
      tenant.id,
    );
    let layout: ArticleLayout = "stack";
    if (campaign.template_id) {
      const { data, error } = await db
        .from("newsletter_templates")
        .select("settings")
        .eq("id", campaign.template_id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      layout = data?.settings?.articleLayout || "stack";
    }
    const subject = campaign.subject || `${siteName} Newsletter`;
    let recipientCount = 0;
    for (const batch of batches) {
      const recipients = batch.recipients as Recipient[];
      recipientCount += recipients.length;
      if (batch.status === "sent") continue;
      if (["sending", "uncertain"].includes(batch.status)) {
        requestStarted = true;
        throw new Error(
          "A previous delivery has an unconfirmed outcome. Review SendGrid delivery logs before retrying.",
        );
      }
      const { data: claimedBatch, error } = await db
        .from("newsletter_send_batches")
        .update({ status: "sending", updated_at: new Date().toISOString() })
        .eq("campaign_id", campaign.id)
        .eq("batch_index", batch.batch_index)
        .in("status", ["pending", "failed"])
        .select("batch_index");
      if (error || !claimedBatch?.length)
        throw new Error("Could not claim delivery batch");
      const html = buildEmailHtml(
        blocks,
        subject,
        branding,
        campaign.preview_text || "",
        "__PRESS_UNSUBSCRIBE_URL__",
        layout,
      );
      const plain = blocks
        .map((b) =>
          b.type === "article"
            ? `${b.articleTitle}\n${b.articleExcerpt || ""}\n${siteUrl}/article/${b.articleSlug}`
            : b.type === "text"
              ? [b.textTitle, b.textBody].filter(Boolean).join("\n")
              : b.type === "hero_text"
                ? [b.headline, b.subheadline, b.introText]
                    .filter(Boolean)
                    .join("\n")
                : b.type === "button"
                  ? `${b.buttonText}: ${b.buttonLink}`
                  : "",
        )
        .filter(Boolean)
        .join("\n\n");
      // Personalizations keep addresses private and provide independent unsubscribe links.
      const personalizations = recipients.map((r) => {
        const unsubscribe = `${siteUrl}/api/newsletter/unsubscribe-link?token=${encodeURIComponent(createNewsletterUnsubscribeToken(r.userId, tenant.id))}`;
        return {
          to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
          custom_args: { campaign_id: campaign.id },
          substitutions: { __PRESS_UNSUBSCRIBE_URL__: unsubscribe },
          headers: {
            "List-Unsubscribe": `<${unsubscribe}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });
      requestStarted = true;
      let response: Response;
      try {
        response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          signal: AbortSignal.timeout(25000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          },
          body: JSON.stringify({
            personalizations,
            from: {
              email:
                tenant.from_email ||
                process.env.SENDGRID_FROM_EMAIL ||
                "admin@dpjmedia.com",
              name: tenant.from_name || siteName,
            },
            subject,
            categories: [
              sendGridNewsletterGlobalCategory(tenant),
              sendGridCategoryForCampaign(campaign.id),
            ],
            content: [
              {
                type: "text/plain",
                value: `${plain || subject}\n\nUnsubscribe: __PRESS_UNSUBSCRIBE_URL__`,
              },
              { type: "text/html", value: html },
            ],
          }),
        });
      } catch (e) {
        await db
          .from("newsletter_send_batches")
          .update({ status: "uncertain", updated_at: new Date().toISOString() })
          .eq("campaign_id", campaign.id)
          .eq("batch_index", batch.batch_index);
        throw e;
      }
      if (!response.ok) {
        const { error } = await db
          .from("newsletter_send_batches")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("campaign_id", campaign.id)
          .eq("batch_index", batch.batch_index);
        requestStarted = !!error;
        throw new Error(`Email provider rejected batch (${response.status})`);
      }
      const { error: markError } = await db
        .from("newsletter_send_batches")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("campaign_id", campaign.id)
        .eq("batch_index", batch.batch_index);
      if (markError)
        throw new Error(
          "Email accepted but delivery checkpoint failed; review provider logs before retrying",
        );
      requestStarted = false;
    }
    const { error } = await db
      .from("newsletter_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        scheduled_at: null,
        recipient_count: recipientCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id)
      .eq("tenant_id", tenant.id)
      .eq("status", "sending");
    if (error) throw new Error(error.message);
    return { recipientCount };
  } catch (error) {
    // Confirmed accepted batches stay checkpointed. Never automatically replay an ambiguous send.
    if (!requestStarted)
      await db
        .from("newsletter_campaigns")
        .update({
          status: scheduled ? "scheduled" : "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)
        .eq("status", "sending");
    throw error;
  }
}
