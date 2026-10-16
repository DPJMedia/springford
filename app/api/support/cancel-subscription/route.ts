import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOriginRequest } from "@/lib/http/sameOrigin";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { transactionalEmailBrandingFromTenant } from "@/lib/emails/emailBranding";
import { createClient } from "@/lib/supabase/server";
import { sendSupportCancelConfirmationEmail } from "@/lib/support/sendSupportCancelConfirmationEmail";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
import { cancelSupportSubscription } from "@/lib/support/stripeCancelSupportSubscription";
import {
  clearStripeSubscriptionFromProfile,
  syncStripeSubscriptionToProfile,
} from "@/lib/support/stripeSubscriptionProfile";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Cancels recurring support at the end of the current billing period.
 * Immediately syncs profile from Stripe so the UI updates without waiting for webhooks.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({error:"Forbidden"},{status:403});
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

    const tenant = await getTenantForApiRoute();
    const { data: support, error: profileError } = await createAdminClient().from("support_subscriptions").select("profile")
      .eq("user_id",user.id).eq("tenant_id",tenant.id).order("updated_at",{ascending:false}).limit(1).maybeSingle();
    let profile = support?.profile;
    if (!profile && tenant.slug === "spring-ford") {
      const legacy = await supabase.from("user_profiles").select("stripe_support_subscription_id,support_subscription_status").eq("id",user.id).single();
      if (legacy.error) throw new Error("Could not load recurring support");
      profile = legacy.data;
    }
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
    const subscription = await stripe.subscriptions.retrieve(subId);
    if (subscription.metadata?.supabase_user_id !== user.id || (subscription.metadata?.tenant_id && subscription.metadata.tenant_id !== tenant.id)) return NextResponse.json({error:"Forbidden"},{status:403});
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
      const branding = transactionalEmailBrandingFromTenant(tenant);
      await sendSupportCancelConfirmationEmail(user.email, branding, {
        email:
          tenant.from_email ||
          process.env.SENDGRID_FROM_EMAIL ||
          process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
          "admin@dpjmedia.com",
        name:
          tenant.from_name ||
          process.env.SENDGRID_FROM_NAME ||
          tenant.name,
      });
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
