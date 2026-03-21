import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sync Stripe Subscription → user_profiles. If subscription is ended, clears support fields.
 */
export async function syncStripeSubscriptionToProfile(sub: Stripe.Subscription): Promise<void> {
  if (
    sub.status === "canceled" ||
    sub.status === "incomplete_expired" ||
    sub.status === "unpaid"
  ) {
    await clearStripeSubscriptionFromProfile(sub.id);
    return;
  }

  const supabaseUserId = sub.metadata?.supabase_user_id;
  if (!supabaseUserId) {
    console.warn("Subscription missing supabase_user_id metadata", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const interval = item?.price?.recurring?.interval ?? null;
  const amountCents = item?.price?.unit_amount ?? null;

  const ext = sub as Stripe.Subscription & {
    current_period_end?: number;
    cancel_at?: number | null;
    cancel_at_period_end?: boolean;
    created?: number;
  };

  const periodEnd = ext.current_period_end;
  const cancelAtUnix = ext.cancel_at;
  const cancelAtPeriodEnd = ext.cancel_at_period_end === true;
  const planMeta = typeof sub.metadata?.plan === "string" ? sub.metadata.plan : null;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("Admin client unavailable:", e);
    return;
  }

  const { error } = await admin
    .from("user_profiles")
    .update({
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_support_subscription_id: sub.id,
      support_subscription_status: sub.status,
      support_subscription_interval: interval,
      support_subscription_plan: planMeta,
      support_subscription_amount_cents: amountCents,
      support_subscription_current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      support_subscription_cancel_at: cancelAtUnix
        ? new Date(cancelAtUnix * 1000).toISOString()
        : null,
      support_subscription_cancel_at_period_end: cancelAtPeriodEnd,
      support_subscription_started_at: ext.created
        ? new Date(ext.created * 1000).toISOString()
        : null,
    })
    .eq("id", supabaseUserId);

  if (error) {
    console.error("Failed to sync subscription to profile:", error);
  }
}

export async function clearStripeSubscriptionFromProfile(subscriptionId: string): Promise<void> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("Admin client unavailable:", e);
    return;
  }

  const { error } = await admin
    .from("user_profiles")
    .update({
      stripe_support_subscription_id: null,
      support_subscription_status: "canceled",
      support_subscription_cancel_at: null,
      support_subscription_plan: null,
      support_subscription_interval: null,
      support_subscription_amount_cents: null,
      support_subscription_current_period_end: null,
      support_subscription_cancel_at_period_end: null,
      support_subscription_started_at: null,
    })
    .eq("stripe_support_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to clear subscription from profile:", error);
  }
}
