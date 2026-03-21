const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.springford.press";

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

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Red Hat Display',system-ui,sans-serif;background:#e8e8e8;">
  <table role="presentation" width="100%" style="background:#e8e8e8;"><tr><td align="center" style="padding:32px 20px;">
    <table style="max-width:560px;background:#fff;border:1px solid #e0e0e0;border-radius:12px;"><tr><td style="padding:40px 32px;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;">Recurring support canceled</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">
        Your recurring contribution to Spring-Ford Press has been canceled. You will not be charged again for this subscription.
      </p>
      <p style="margin:0;font-size:15px;color:#666;">
        Thank you for supporting local news — we hope to see you again.
      </p>
      <p style="margin:24px 0 0;font-size:14px;color:#666;">
        — The Spring-Ford Press team
      </p>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:13px;color:#666;">
      <a href="${SITE_URL}" style="color:#2b8aa8;">Spring-Ford Press</a>
    </p>
  </td></tr></table>
</body></html>`;

  const plain = `Your recurring contribution to Spring-Ford Press has been canceled. You will not be charged again for this subscription.\n\nThank you for supporting local news.\n\n— The Spring-Ford Press team\n\n${SITE_URL}`;

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
