import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.springford.press";
const TOS_URL = SITE_URL.replace(/\/$/, "") + "/terms-of-service";
const PRIVACY_URL = SITE_URL.replace(/\/$/, "") + "/privacy-policy";
const CONTACT_URL = SITE_URL.replace(/\/$/, "") + "/contact";

function buildThankYouEmailHtml(amountDollars: string, receiptUrl: string | null): string {
  const receiptSection = receiptUrl
    ? `
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.65; color: #1a1a1a; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
      <strong>Your payment receipt</strong> is available to view or print at any time:
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #1a1a1a; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
      <a href="${receiptUrl}" style="color: #2b8aa8; font-weight: 600; text-decoration: underline;">View your receipt →</a>
    </p>`
    : `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #1a1a1a; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
      A receipt for your payment has been sent by our payment processor.
    </p>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for your support</title>
</head>
<body style="margin:0; padding:0; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif; background-color: #e8e8e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8e8e8;">
    <tr>
      <td align="center" style="padding: 32px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px;">
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1a1a1a;">Thank you for your contribution</h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                Your support helps us keep independent, neighborhood-first reporting in the Spring-Ford area.
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; color: #666666;">Amount contributed:</p>
              <p style="margin: 0 0 24px; font-size: 28px; font-weight: 700; color: #1a1a1a;">${amountDollars}</p>
              ${receiptSection}
              <p style="margin: 0; font-size: 15px; color: #333333;">
                — The Spring-Ford Press team
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 13px; color: #666666; text-align: center;">
          <a href="${SITE_URL}" style="color: #2b8aa8; text-decoration: underline;">Spring-Ford Press</a>
          &nbsp;|&nbsp;
          <a href="${TOS_URL}" style="color: #2b8aa8; text-decoration: underline;">Terms of Service</a>
          &nbsp;|&nbsp;
          <a href="${PRIVACY_URL}" style="color: #2b8aa8; text-decoration: underline;">Privacy Policy</a>
          &nbsp;|&nbsp;
          <a href="${CONTACT_URL}" style="color: #2b8aa8; text-decoration: underline;">Contact Us</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const sessionId = session.id;
  const customerEmail = session.customer_email || session.customer_details?.email;
  const amountTotal = session.amount_total ?? 0;
  const amountDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountTotal / 100);

  let receiptUrl: string | null = null;
  if (session.payment_intent) {
    try {
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
      const charge = paymentIntent.latest_charge;
      if (charge && typeof charge === "object" && "receipt_url" in charge && charge.receipt_url) {
        receiptUrl = charge.receipt_url as string;
      }
    } catch (e) {
      console.warn("Could not retrieve receipt URL:", e);
    }
  }

  if (!customerEmail) {
    console.warn("No customer email for session", sessionId);
    return NextResponse.json({ received: true });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "admin@dpjmedia.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "Spring-Ford Press";

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set; skipping thank-you email");
    return NextResponse.json({ received: true });
  }

  const html = buildThankYouEmailHtml(amountDollars, receiptUrl);
  const plainText = `Thank you for your contribution to Spring-Ford Press.\n\nAmount: ${amountDollars}\n\n${receiptUrl ? `View your receipt: ${receiptUrl}\n\n` : ""}— The Spring-Ford Press team\n\nSpring-Ford Press: ${SITE_URL}\nTerms of Service: ${TOS_URL}\nPrivacy Policy: ${PRIVACY_URL}\nContact Us: ${CONTACT_URL}`;

  try {
    const res = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: customerEmail }], subject: "Thank you for supporting Spring-Ford Press" }],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: "text/plain", value: plainText },
          { type: "text/html", value: html },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("SendGrid thank-you email error:", res.status, errText);
    }
  } catch (e) {
    console.error("Failed to send thank-you email:", e);
  }

  return NextResponse.json({ received: true });
}
