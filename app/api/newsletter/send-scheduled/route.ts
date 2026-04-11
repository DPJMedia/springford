import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildEmailHtml, newsletterBrandingFromTenant } from "@/lib/newsletter/buildEmailHtml";
import type { NewsletterBlock, ArticleLayout } from "@/lib/newsletter/buildEmailHtml";
import { enrichArticleBlocksWithAdvertisementFlags } from "@/lib/newsletter/enrichArticleBlocksForEmail";
import {
  sendGridNewsletterGlobalCategory,
  sendGridCategoryForCampaign,
} from "@/lib/newsletter/sendGridCampaign";
import { getTenantById, getTenantBySlug } from "@/lib/tenant/getTenant";
import { getSiteConfig } from "@/lib/seo/site";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export const runtime = "edge";

const isProduction =
  process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (isProduction) {
    if (!cronSecret) {
      console.error("[send-scheduled] CRON_SECRET is required in production");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 503 }
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date().toISOString();

  // Find all scheduled campaigns whose scheduled_at has passed
  const { data: campaigns, error } = await supabase
    .from("newsletter_campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  if (error) {
    console.error("[send-scheduled] DB error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: "No campaigns due" });
  }

  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "SendGrid API key not configured" }, { status: 500 });
  }

  const results: Array<{ id: string; name: string; success: boolean; error?: string; recipientCount?: number }> = [];

  for (const campaign of campaigns) {
    try {
      let tenant =
        campaign.tenant_id != null ? await getTenantById(campaign.tenant_id as string) : null;
      if (!tenant) {
        tenant = await getTenantBySlug("spring-ford");
      }
      if (!tenant) {
        results.push({
          id: campaign.id,
          name: campaign.name,
          success: false,
          error: "Tenant not found for campaign",
        });
        continue;
      }

      const { siteUrl, siteName } = getSiteConfig(tenant);
      const emailBranding = newsletterBrandingFromTenant(tenant);
      const fromEmail =
        tenant.from_email ||
        process.env.SENDGRID_FROM_EMAIL ||
        process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
        "admin@dpjmedia.com";
      const fromName =
        tenant.from_name || process.env.SENDGRID_FROM_NAME || siteName;

      let blocks: NewsletterBlock[] = Array.isArray(campaign.blocks) ? campaign.blocks : [];
      blocks = await enrichArticleBlocksWithAdvertisementFlags(supabase, blocks, tenant.id);
      const subject = campaign.subject || `${siteName} Newsletter`;
      const previewText = campaign.preview_text || "";
      const recipientsType: string = campaign.recipients_type || "newsletter";

      // Fetch article layout from template settings
      let articleLayout: ArticleLayout = "stack";
      if (campaign.template_id) {
        const { data: template } = await supabase
          .from("newsletter_templates")
          .select("settings")
          .eq("id", campaign.template_id)
          .single();
        if (template?.settings) {
          const s = template.settings as Record<string, unknown>;
          if (s.articleLayout) articleLayout = s.articleLayout as ArticleLayout;
        }
      }

      const unsubscribeUrl = `${siteUrl}/profile?tab=newsletter`;
      const html = buildEmailHtml(
        blocks,
        subject,
        emailBranding,
        previewText,
        unsubscribeUrl,
        articleLayout,
      );

      const plainBody = blocks
        .map((b: NewsletterBlock) => {
          if (b.type === "hero_text") return [b.headline, b.subheadline, b.introText].filter(Boolean).join("\n\n");
          if (b.type === "article") return `${b.articleTitle}\n${b.articleExcerpt || ""}\n${siteUrl}/article/${b.articleSlug}`;
          if (b.type === "text") return [b.textTitle, b.textBody].filter(Boolean).join("\n\n");
          if (b.type === "button") return `${b.buttonText}: ${b.buttonLink}`;
          return "";
        })
        .filter(Boolean)
        .join("\n\n---\n\n");
      const plainText = `${plainBody || subject}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

      // Fetch recipients
      let recipients: Array<{ email: string; name?: string }> = [];

      if (recipientsType === "newsletter") {
        const { data: subs } = await supabase
          .from("tenant_newsletter_subscriptions")
          .select("user_id")
          .eq("tenant_id", tenant.id)
          .eq("subscribed", true);

        const userIds = (subs || []).map((s) => s.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("email, full_name")
            .in("id", userIds)
            .not("email", "is", null);

          recipients = (profiles || [])
            .filter((s) => s.email)
            .map((s) => ({ email: s.email as string, name: s.full_name || undefined }));
        }
      } else {
        let query = supabase.from("user_profiles").select("email, full_name").not("email", "is", null);
        if (recipientsType === "super_admins") {
          query = query.eq("is_super_admin", true);
        }
        const { data: subscribers } = await query;
        recipients = (subscribers || [])
          .filter((s) => s.email)
          .map((s) => ({ email: s.email as string, name: s.full_name || undefined }));
      }

      if (recipients.length === 0) {
        await supabase
          .from("newsletter_campaigns")
          .update({ status: "draft", updated_at: now })
          .eq("id", campaign.id);
        results.push({ id: campaign.id, name: campaign.name, success: false, error: "No recipients found" });
        continue;
      }

      const categoryTag = sendGridCategoryForCampaign(campaign.id);
      const globalCategory = sendGridNewsletterGlobalCategory(tenant);
      // Send in batches of 1000 (SendGrid limit per request)
      const BATCH_SIZE = 1000;
      let sendError: string | null = null;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const body = {
          personalizations: batch.map((r) => ({
            to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
            custom_args: { campaign_id: campaign.id },
          })),
          from: { email: fromEmail, name: fromName },
          subject,
          categories: [globalCategory, categoryTag],
          content: [
            { type: "text/plain", value: plainText || subject },
            { type: "text/html", value: html },
          ],
        };

        const res = await fetch(SENDGRID_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          sendError = `SendGrid ${res.status}: ${errText}`;
          console.error("[send-scheduled] SendGrid error:", sendError);
          break;
        }
      }

      if (sendError) {
        results.push({ id: campaign.id, name: campaign.name, success: false, error: sendError });
        continue;
      }

      // Mark sent
      await supabase
        .from("newsletter_campaigns")
        .update({ status: "sent", sent_at: now, recipient_count: recipients.length, updated_at: now })
        .eq("id", campaign.id);

      results.push({ id: campaign.id, name: campaign.name, success: true, recipientCount: recipients.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[send-scheduled] Error processing campaign ${campaign.id}:`, msg);
      results.push({ id: campaign.id, name: campaign.name, success: false, error: msg });
    }
  }

  const sentCount = results.filter((r) => r.success).length;
  return NextResponse.json({ success: true, sent: sentCount, results, timestamp: now });
}
