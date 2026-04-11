import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fallbackTransactionalEmailBranding, type TransactionalEmailBranding } from "@/lib/emails/emailBranding";
import { verifySupportCancelToken } from "@/lib/support/cancelToken";
import { sendSupportCancelConfirmationEmail } from "@/lib/support/sendSupportCancelConfirmationEmail";
import { cancelSupportSubscription } from "@/lib/support/stripeCancelSupportSubscription";
import {
  clearStripeSubscriptionFromProfile,
  syncStripeSubscriptionToProfile,
} from "@/lib/support/stripeSubscriptionProfile";
import { getTenant } from "@/lib/tenant/getTenant";
import type { TenantRow } from "@/lib/types/database";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function baseUrlFromToken(data: { siteUrl?: string }): string {
  if (data.siteUrl) {
    return data.siteUrl.replace(/\/$/, "");
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.springford.press"
  );
}

function brandingFromCancelToken(data: {
  siteUrl?: string;
  siteName?: string;
}): TransactionalEmailBranding {
  if (data.siteUrl && data.siteName) {
    const siteUrl = data.siteUrl.replace(/\/$/, "");
    return {
      siteUrl,
      siteName: data.siteName,
      from_email: "admin@dpjmedia.com",
      from_name: data.siteName,
    };
  }
  return fallbackTransactionalEmailBranding();
}

async function resolveSendgridFrom(data: {
  siteUrl?: string;
}): Promise<{ email: string; name: string; tenant: TenantRow | null }> {
  let tenant: TenantRow | null = null;
  if (data.siteUrl) {
    try {
      const hostname = new URL(data.siteUrl).hostname;
      tenant = await getTenant(hostname);
    } catch {
      /* noop */
    }
  }
  const fb = fallbackTransactionalEmailBranding();
  if (tenant) {
    return {
      email:
        tenant.from_email ||
        process.env.SENDGRID_FROM_EMAIL ||
        process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
        "admin@dpjmedia.com",
      name:
        tenant.from_name ||
        process.env.SENDGRID_FROM_NAME ||
        tenant.name,
      tenant,
    };
  }
  return {
    email:
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
      "admin@dpjmedia.com",
    name: process.env.SENDGRID_FROM_NAME || fb.siteName,
    tenant: null,
  };
}

/**
 * One-click cancel from signed link in thank-you email (no login).
 * GET /api/support/cancel-from-email?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const defaultBase = (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://www.springford.press"
    );

    if (!token) {
      return NextResponse.redirect(new URL("/support?cancelError=missing", defaultBase));
    }

    const data = verifySupportCancelToken(token);
    if (!data) {
      return NextResponse.redirect(new URL("/support?cancelError=invalid", defaultBase));
    }

    const base = baseUrlFromToken(data);
    const branding = brandingFromCancelToken(data);
    const from = await resolveSendgridFrom(data);

    const sub = await stripe.subscriptions.retrieve(data.sub);

    if (sub.metadata?.supabase_user_id !== data.uid) {
      return NextResponse.redirect(new URL("/support?cancelError=forbidden", base));
    }

    if (
      sub.status === "canceled" ||
      sub.status === "incomplete_expired" ||
      sub.status === "unpaid"
    ) {
      await syncStripeSubscriptionToProfile(sub);
      await sendSupportCancelConfirmationEmail(data.em, branding, {
        email: from.email,
        name: from.name,
      });
      return NextResponse.redirect(
        new URL("/profile?tab=support&supportCanceled=1", base),
      );
    }

    const outcome = await cancelSupportSubscription(data.sub);
    try {
      const subAfter = await stripe.subscriptions.retrieve(data.sub);
      await syncStripeSubscriptionToProfile(subAfter);
    } catch (e) {
      const err = e as { code?: string; statusCode?: number };
      if (err.code === "resource_missing" || err.statusCode === 404) {
        await clearStripeSubscriptionFromProfile(data.sub);
      } else {
        console.warn("Could not retrieve subscription after email cancel to sync profile:", e);
      }
    }

    if (outcome === "updated") {
      await sendSupportCancelConfirmationEmail(data.em, branding, {
        email: from.email,
        name: from.name,
      });
    }

    return NextResponse.redirect(
      new URL("/profile?tab=support&supportCanceled=1", base),
    );
  } catch (err) {
    console.error("cancel-from-email error:", err);
    const fb = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.springford.press";
    return NextResponse.redirect(new URL("/support?cancelError=failed", fb));
  }
}
