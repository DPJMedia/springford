/**
 * Internal notifications to the team inbox (SendGrid).
 */

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

const TEAM_INBOX = "admin@dpjmedia.com";

export async function sendTeamInboxEmail(options: {
  subject: string;
  textBody: string;
  htmlBody: string;
  /** When set, Reply-To on the message so staff can respond to the submitter. */
  replyTo?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Email is not configured" };
  }

  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL?.trim() || "admin@dpjmedia.com";
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "Site forms";

  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: TEAM_INBOX }], subject: options.subject }],
    from: { email: fromEmail, name: fromName },
    content: [
      { type: "text/plain", value: options.textBody },
      { type: "text/html", value: options.htmlBody },
    ],
  };

  if (options.replyTo && options.replyTo.includes("@")) {
    payload.reply_to = { email: options.replyTo.trim() };
  }

  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[sendTeamInboxEmail]", res.status, errText);
    return { ok: false, error: "Failed to send notification" };
  }

  return { ok: true };
}
