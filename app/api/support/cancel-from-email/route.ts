import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifySupportCancelToken } from "@/lib/support/cancelToken";
import { sendSupportCancelConfirmationEmail } from "@/lib/support/sendSupportCancelConfirmationEmail";
import { cancelSupportSubscription } from "@/lib/support/stripeCancelSupportSubscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.springford.press";

/**
 * One-click cancel from signed link in thank-you email (no login).
 * GET /api/support/cancel-from-email?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(new URL("/support?cancelError=missing", SITE_URL));
    }

    const data = verifySupportCancelToken(token);
    if (!data) {
      return NextResponse.redirect(new URL("/support?cancelError=invalid", SITE_URL));
    }

    const sub = await stripe.subscriptions.retrieve(data.sub);

    if (sub.metadata?.supabase_user_id !== data.uid) {
      return NextResponse.redirect(new URL("/support?cancelError=forbidden", SITE_URL));
    }

    if (
      sub.status === "canceled" ||
      sub.status === "incomplete_expired" ||
      sub.status === "unpaid"
    ) {
      await sendSupportCancelConfirmationEmail(data.em);
      return NextResponse.redirect(
        new URL("/profile?tab=support&supportCanceled=1", SITE_URL)
      );
    }

    await cancelSupportSubscription(data.sub);
    await sendSupportCancelConfirmationEmail(data.em);

    return NextResponse.redirect(
      new URL("/profile?tab=support&supportCanceled=1", SITE_URL)
    );
  } catch (err) {
    console.error("cancel-from-email error:", err);
    return NextResponse.redirect(new URL("/support?cancelError=failed", SITE_URL));
  }
}
