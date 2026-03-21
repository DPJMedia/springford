import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { sendSupportCancelConfirmationEmail } from "@/lib/support/sendSupportCancelConfirmationEmail";
import { cancelSupportSubscription } from "@/lib/support/stripeCancelSupportSubscription";
import {
  clearStripeSubscriptionFromProfile,
  syncStripeSubscriptionToProfile,
} from "@/lib/support/stripeSubscriptionProfile";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Cancels recurring support (end of current period, or immediate if Stripe requires).
 * Immediately syncs profile from Stripe so the UI updates without waiting for webhooks.
 */
export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("stripe_support_subscription_id, support_subscription_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_support_subscription_id) {
      return NextResponse.json(
        { error: "No active recurring support found" },
        { status: 400 }
      );
    }

    if (
      profile.support_subscription_status === "canceled" ||
      profile.support_subscription_status === "unpaid"
    ) {
      return NextResponse.json({ error: "Subscription is already ended" }, { status: 400 });
    }

    const subId = profile.stripe_support_subscription_id;
    const outcome = await cancelSupportSubscription(subId);

    try {
      const subAfter = await stripe.subscriptions.retrieve(subId);
      await syncStripeSubscriptionToProfile(subAfter);
    } catch (e) {
      const err = e as { code?: string; statusCode?: number };
      if (err.code === "resource_missing" || err.statusCode === 404) {
        await clearStripeSubscriptionFromProfile(subId);
      } else {
        console.warn("Could not retrieve subscription after cancel to sync profile:", e);
      }
    }

    if (outcome === "updated") {
      await sendSupportCancelConfirmationEmail(user.email);
    }

    return NextResponse.json({ ok: true, noop: outcome === "noop" });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to cancel" },
      { status: 500 }
    );
  }
}
