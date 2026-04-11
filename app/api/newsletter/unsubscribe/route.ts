import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { transactionalEmailBrandingFromTenant } from "@/lib/emails/emailBranding";
import {
  buildNewsletterUnsubscribeConfirmationHtml,
  buildNewsletterUnsubscribeConfirmationPlain,
} from "@/lib/emails/newsletterUnsubscribeConfirmation";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getTenantForApiRoute();
    const branding = transactionalEmailBrandingFromTenant(tenant);

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        newsletter_subscribed: false,
        newsletter_subscribed_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Unsubscribe update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 },
      );
    }

    const { error: tenantUnsubErr } = await supabase
      .from("tenant_newsletter_subscriptions")
      .update({
        subscribed: false,
        unsubscribed_at: now,
      })
      .eq("user_id", user.id)
      .eq("tenant_id", tenant.id);

    if (tenantUnsubErr) {
      console.error("tenant_newsletter_subscriptions update:", tenantUnsubErr);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 },
      );
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail =
      tenant.from_email ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
      "admin@dpjmedia.com";
    const fromName =
      tenant.from_name || process.env.SENDGRID_FROM_NAME || branding.siteName;

    if (apiKey) {
      const subject = `We're sorry to see you go — ${branding.siteName}`;

      const body = {
        personalizations: [
          {
            to: [{ email: user.email }],
            subject,
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [
          {
            type: "text/plain",
            value: buildNewsletterUnsubscribeConfirmationPlain(branding),
          },
          {
            type: "text/html",
            value: buildNewsletterUnsubscribeConfirmationHtml(branding),
          },
        ],
      };

      const res = await fetch(SENDGRID_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("SendGrid departure email error:", res.status, errText);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
