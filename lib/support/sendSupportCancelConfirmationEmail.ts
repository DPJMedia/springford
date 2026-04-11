import type { TransactionalEmailBranding } from "@/lib/emails/emailBranding";
import {
  buildSupportCancelConfirmationHtml,
  buildSupportCancelConfirmationPlain,
} from "@/lib/emails/supportCancelConfirmation";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

/**
 * Sent after recurring support is canceled (profile or email link).
 */
export async function sendSupportCancelConfirmationEmail(
  toEmail: string,
  branding: TransactionalEmailBranding,
  from: { email: string; name: string },
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set; skipping cancel confirmation email");
    return;
  }

  const html = buildSupportCancelConfirmationHtml(branding);
  const plain = buildSupportCancelConfirmationPlain(branding);

  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: toEmail }],
          subject: `Your ${branding.siteName} support has been canceled`,
        },
      ],
      from: { email: from.email, name: from.name },
      content: [
        { type: "text/plain", value: plain },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("SendGrid cancel confirmation error:", res.status, errText);
  }
}
