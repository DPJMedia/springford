import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSupportCancelConfirmationEmail } from "@/lib/support/sendSupportCancelConfirmationEmail";
import { cancelSupportSubscription } from "@/lib/support/stripeCancelSupportSubscription";

/**
 * Cancels recurring support (end of current period, or immediate if Stripe requires).
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

    const outcome = await cancelSupportSubscription(profile.stripe_support_subscription_id);
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
