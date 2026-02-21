import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const SITE_URL = "https://www.springford.press";

function buildDepartureEmailHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We're sorry to see you go</title>
</head>
<body style="margin:0; padding:0; font-family: Georgia, 'Times New Roman', serif; background-color: #e8e8e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8e8e8;">
    <tr>
      <td align="center" style="padding: 24px 20px 32px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000; letter-spacing: -0.02em;">Spring-Ford Press</h1>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 20px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border: 1px solid #d0d0d0;">
          <tr>
            <td style="padding: 40px 48px 32px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #000000;">
                We're sorry to see you go
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a;">
                You've been unsubscribed from the Spring-Ford Press newsletter.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333;">
                We hope to see you again soon. If you change your mind, you can always resubscribe from your profile or at <a href="${SITE_URL}/subscribe" style="color: #2563eb;">springford.press/subscribe</a>.
              </p>
              <p style="margin: 0; font-size: 15px; color: #333333;">
                — The Spring-Ford Press team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 48px 24px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                <a href="${SITE_URL}" style="color: #000000;">Spring-Ford Press</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        { status: 500 }
      );
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
      "admin@dpjmedia.com";
    const fromName =
      process.env.SENDGRID_FROM_NAME || "Spring-Ford Press";

    if (apiKey) {
      const body = {
        personalizations: [
          {
            to: [{ email: user.email }],
            subject: "We're sorry to see you go — Spring-Ford Press",
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [
          {
            type: "text/plain",
            value:
              "We're sorry to see you go.\n\nYou've been unsubscribed from the Spring-Ford Press newsletter. If you change your mind, you can resubscribe at springford.press/subscribe.\n\n— The Spring-Ford Press team",
          },
          {
            type: "text/html",
            value: buildDepartureEmailHtml(),
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
      { status: 500 }
    );
  }
}
