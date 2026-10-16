import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  clearStripeSubscriptionFromProfile,
  syncStripeSubscriptionToProfile,
} from "@/lib/support/stripeSubscriptionProfile";
import {
  fallbackTransactionalEmailBranding,
  transactionalEmailBrandingFromTenant,
} from "@/lib/emails/emailBranding";
import { buildStandardEmailFooterPlain } from "@/lib/emails/emailFooter";
import { buildThankYouEmailHtml } from "@/lib/emails/supportThankYou";
import { getTenantById, getTenantBySlug } from "@/lib/tenant/getTenant";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + months);
  return out;
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

  const db=createAdminClient();
  const {data: claimed,error: claimError}=await db.rpc("claim_stripe_webhook_event",{p_id:event.id,p_type:event.type});
  if(claimError)return NextResponse.json({error:"Could not claim webhook"},{status:503});
  if(!claimed){const {data,error}=await db.from("stripe_webhook_events").select("processed_at").eq("event_id",event.id).maybeSingle();return !error&&data?.processed_at?NextResponse.json({received:true}):NextResponse.json({error:"Webhook is processing"},{status:503});}
  try{
    const response=await processStripeEvent(event);
    if(response.status>=400)throw new Error("Webhook processing failed");
    const {error}=await db.from("stripe_webhook_events").update({processed_at:new Date().toISOString()}).eq("event_id",event.id);
    if(error)throw new Error("Could not record webhook completion");
    return response;
  }catch(error){console.error("Stripe webhook processing failed",event.id,error);await db.from("stripe_webhook_events").delete().eq("event_id",event.id).is("processed_at",null);return NextResponse.json({error:"Please retry webhook delivery"},{status:503});}
}
async function processStripeEvent(event: Stripe.Event) {
  if (event.type === "customer.subscription.deleted") {
    await clearStripeSubscriptionFromProfile((event.data.object as Stripe.Subscription).id);
    return NextResponse.json({ received: true });
  }

  if (event.type === "customer.subscription.updated") {
    await syncStripeSubscriptionToProfile(event.data.object as Stripe.Subscription);
    return NextResponse.json({ received: true });
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
  const amountDollars = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountTotal / 100);

  const isSubscription = session.mode === "subscription";

  let tenant =
    session.metadata?.tenant_id != null && session.metadata.tenant_id !== ""
      ? await getTenantById(String(session.metadata.tenant_id))
      : null;
  if (!tenant) {
    tenant = await getTenantBySlug("spring-ford");
  }
  const branding = tenant
    ? transactionalEmailBrandingFromTenant(tenant)
    : fallbackTransactionalEmailBranding();
  const fromEmail =
    tenant?.from_email ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
    "admin@dpjmedia.com";
  const fromName =
    tenant?.from_name ||
    process.env.SENDGRID_FROM_NAME ||
    branding.siteName;

  let receiptUrl: string | null = null;
  let intervalLabel: string | undefined;
  let cancelAtLabel: string | null = null;
  let cancelViaEmailUrl: string | null = null;

  if (isSubscription && session.subscription) {
    try {
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      let fullSub = await stripe.subscriptions.retrieve(subId, {
        expand: ["latest_invoice", "latest_invoice.payment_intent"],
      });

      // Checkout does not allow subscription_data.cancel_at; apply fixed term here.
      if (
        fullSub.metadata?.plan === "monthly_limited" &&
        fullSub.metadata?.duration_months
      ) {
        const months = parseInt(fullSub.metadata.duration_months, 10);
        if (!Number.isNaN(months) && months >= 1 && months <= 36) {
          const cancelAt = addMonths(new Date(fullSub.created * 1000), months);
          const cancelAtUnix = Math.floor(cancelAt.getTime() / 1000);
          try {
            await stripe.subscriptions.update(subId, { cancel_at: cancelAtUnix });
            fullSub = await stripe.subscriptions.retrieve(subId, {
              expand: ["latest_invoice", "latest_invoice.payment_intent"],
            });
          } catch (e) {
            throw e;
          }
        }
      }

      await syncStripeSubscriptionToProfile(fullSub);

      const inv = fullSub.latest_invoice;
      if (inv && typeof inv === "object" && "hosted_invoice_url" in inv && inv.hosted_invoice_url) {
        receiptUrl = inv.hosted_invoice_url as string;
      }

      const item = fullSub.items.data[0];
      const interval = item?.price?.recurring?.interval;
      if (interval === "month") intervalLabel = "monthly";
      else if (interval === "year") intervalLabel = "annual";

      if (fullSub.cancel_at) {
        cancelAtLabel = new Date(fullSub.cancel_at * 1000).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }

      const uid = fullSub.metadata?.supabase_user_id;
      if (uid && customerEmail) {
        try {
          const { createSupportCancelToken } = await import("@/lib/support/cancelToken");
          const tok = createSupportCancelToken(fullSub.id, uid, customerEmail, {
            siteUrl: branding.siteUrl,
            siteName: branding.siteName,
          });
          cancelViaEmailUrl = `${branding.siteUrl.replace(/\/$/, "")}/api/support/cancel-from-email?token=${encodeURIComponent(tok)}`;
        } catch (e) {
          console.warn("Could not build email cancel link (set SUPPORT_CANCEL_TOKEN_SECRET or STRIPE_WEBHOOK_SECRET):", e);
        }
      }
    } catch (e) {
      throw e;
    }
  } else if (session.payment_intent) {
    try {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
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

  if (!apiKey) {
    throw new Error("Email sending is not configured; receipt delivery must be retried");
  }

  const subject = isSubscription
    ? `Thank you — your recurring support is set up — ${branding.siteName}`
    : `Thank you for supporting ${branding.siteName}`;

  const html = buildThankYouEmailHtml(amountDollars, receiptUrl, branding, {
    isRecurring: isSubscription,
    intervalLabel,
    cancelAtLabel,
    cancelViaEmailUrl,
  });

  const plainRecurring = isSubscription
    ? `\n\nThis is a recurring contribution. Your Stripe receipt shows recurring billing.${intervalLabel ? ` (${intervalLabel})` : ""}${cancelAtLabel ? ` Scheduled end: ${cancelAtLabel}.` : ""} Manage or cancel from your profile.${cancelViaEmailUrl ? `\n\nCancel from email: ${cancelViaEmailUrl}` : ""}`
    : "";

  const plainText = `Thank you for your contribution to ${branding.siteName}.\n\nAmount: ${amountDollars}${plainRecurring}\n\n${receiptUrl ? `View your receipt: ${receiptUrl}\n\n` : ""}— The ${branding.siteName} team\n\n${buildStandardEmailFooterPlain(branding)}`;

  const db = createAdminClient();
  const receiptId = `receipt:${sessionId}`;
  const {error: receiptClaimError} = await db.from("stripe_webhook_events").insert({event_id:receiptId,event_type:"support_receipt"});
  if (receiptClaimError) {
    if (receiptClaimError.code !== "23505") throw new Error("Could not record receipt delivery");
    const {data,error}=await db.from("stripe_webhook_events").select("processed_at").eq("event_id",receiptId).maybeSingle();
    if (!error && data?.processed_at) return NextResponse.json({received:true});
    throw new Error("Receipt delivery outcome needs review before retrying");
  }
  try {
    const res = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: customerEmail }], subject }],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: "text/plain", value: plainText },
          { type: "text/html", value: html },
        ],
      }),
    });

    if (!res.ok) {
      await db.from("stripe_webhook_events").delete().eq("event_id",receiptId);
      console.error("SendGrid thank-you email error:", res.status);
      throw new Error("Receipt email was rejected");
    }
  } catch (e) {
    throw e;
  }

  const {error:receiptSaveError}=await db.from("stripe_webhook_events").update({processed_at:new Date().toISOString()}).eq("event_id",receiptId);
  if(receiptSaveError)throw new Error("Receipt accepted but confirmation could not be saved");
  return NextResponse.json({ received: true });

}
