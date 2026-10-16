import { isSameOriginRequest } from "@/lib/http/sameOrigin";
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
    if (!isSameOriginRequest(request)) return NextResponse.json({error:"Forbidden"},{status:403});
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getTenantForApiRoute();
    const branding = transactionalEmailBrandingFromTenant(tenant);

    const { data: changed, error: subscriptionError } = await supabase.rpc("set_newsletter_subscription", { p_tenant: tenant.id, p_subscribed: false });
    if (subscriptionError) return NextResponse.json({error:"Could not save subscription"},{status:503});
    if (!changed) return NextResponse.json({ success: true });

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
