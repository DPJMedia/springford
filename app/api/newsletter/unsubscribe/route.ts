import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  buildNewsletterUnsubscribeConfirmationHtml,
  buildNewsletterUnsubscribeConfirmationPlain,
} from "@/lib/emails/newsletterUnsubscribeConfirmation";

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
            value: buildNewsletterUnsubscribeConfirmationPlain(),
          },
          {
            type: "text/html",
            value: buildNewsletterUnsubscribeConfirmationHtml(),
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
