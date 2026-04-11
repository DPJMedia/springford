import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { transactionalEmailBrandingFromTenant } from "@/lib/emails/emailBranding";
import {
  buildNewsletterWelcomeEmailHtml,
  buildNewsletterWelcomeEmailPlain,
} from "@/lib/emails/newsletterWelcome";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getTenantForApiRoute();
    const branding = transactionalEmailBrandingFromTenant(tenant);

    const now = new Date().toISOString();

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update({
        newsletter_subscribed: true,
        newsletter_subscribed_at: now,
      })
      .eq("id", user.id);

    if (profileErr) {
      console.error("Newsletter subscribe profile update:", profileErr);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 },
      );
    }

    const { error: tenantSubErr } = await supabase
      .from("tenant_newsletter_subscriptions")
      .upsert(
        {
          user_id: user.id,
          tenant_id: tenant.id,
          subscribed: true,
          subscribed_at: now,
          unsubscribed_at: null,
        },
        { onConflict: "user_id,tenant_id" },
      );

    if (tenantSubErr) {
      console.error("tenant_newsletter_subscriptions upsert:", tenantSubErr);
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

    if (!apiKey) {
      console.warn("SENDGRID_API_KEY not set; skipping welcome email");
      return NextResponse.json({ success: true });
    }

    const subject = `Thank you for Subscribing! — ${branding.siteName}`;

    const body = {
      personalizations: [{ to: [{ email: email.trim() }], subject }],
      from: { email: fromEmail, name: fromName },
      content: [
        {
          type: "text/plain",
          value: buildNewsletterWelcomeEmailPlain(branding),
        },
        {
          type: "text/html",
          value: buildNewsletterWelcomeEmailHtml(branding),
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
      console.error("SendGrid error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to send welcome email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error sending newsletter welcome email:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 },
    );
  }
}
