import { escapeHtml } from "@/lib/emails/emailLayout";
import { isSameOriginRequest } from "@/lib/http/sameOrigin";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  fallbackTransactionalEmailBranding,
  type TransactionalEmailBranding,
} from "@/lib/emails/emailBranding";
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
      name: tenant.from_name || process.env.SENDGRID_FROM_NAME || tenant.name,
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
 * Confirmation page for a signed cancellation link (no login).
 * GET /api/support/cancel-from-email?token=...
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const data = verifySupportCancelToken(token);
  if (!data)
    return new NextResponse("This cancellation link is invalid or expired.", {
      status: 400,
    });
  return new NextResponse(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Cancel recurring support</title><body style="font:16px system-ui;max-width:40rem;margin:4rem auto;padding:1rem"><h1>Cancel recurring support?</h1><p>Your support will remain active through the end of the current billing period.</p><form method="post" action="/api/support/cancel-from-email"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Confirm cancellation</button></form><p><a href="/">Return to the news</a></p></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return new NextResponse("Forbidden", { status: 403 });
  try {
    const token = String((await request.formData()).get("token") || "");
    const defaultBase =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://www.springford.press";

    if (!token) {
      return NextResponse.redirect(
        new URL("/support?cancelError=missing", defaultBase),
        303,
      );
    }

    const data = verifySupportCancelToken(token);
    if (!data) {
      return NextResponse.redirect(
        new URL("/support?cancelError=invalid", defaultBase),
        303,
      );
    }

    const base = baseUrlFromToken(data);
    const branding = brandingFromCancelToken(data);
    const from = await resolveSendgridFrom(data);

    const sub = await stripe.subscriptions.retrieve(data.sub);

    if (sub.metadata?.supabase_user_id !== data.uid) {
      return NextResponse.redirect(
        new URL("/support?cancelError=forbidden", base),
        303,
      );
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
        303,
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
        console.warn(
          "Could not retrieve subscription after email cancel to sync profile:",
          e,
        );
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
      303,
    );
  } catch (err) {
    console.error("cancel-from-email error:", err);
    const fb =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://www.springford.press";
    return NextResponse.redirect(
      new URL("/support?cancelError=failed", fb),
      303,
    );
  }
}
