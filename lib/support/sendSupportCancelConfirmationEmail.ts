import {
  buildSupportCancelConfirmationHtml,
  buildSupportCancelConfirmationPlain,
} from "@/lib/emails/supportCancelConfirmation";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

/**
 * Sent after recurring support is canceled (profile or email link).
 */
export async function sendSupportCancelConfirmationEmail(toEmail: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "admin@dpjmedia.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "Spring-Ford Press";

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set; skipping cancel confirmation email");
    return;
  }

  const html = buildSupportCancelConfirmationHtml();
  const plain = buildSupportCancelConfirmationPlain();

  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [
        { to: [{ email: toEmail }], subject: "Your Spring-Ford Press support has been canceled" },
      ],
      from: { email: fromEmail, name: fromName },
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
