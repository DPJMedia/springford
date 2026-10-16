import { getTenantById, getTenantBySlug } from "@/lib/tenant/getTenant";
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

  const periodEnd = ext.current_period_end ?? item?.current_period_end;
  const cancelAtUnix = ext.cancel_at;
  const cancelAtPeriodEnd = ext.cancel_at_period_end === true;
  const planMeta = typeof sub.metadata?.plan === "string" ? sub.metadata.plan : null;

  const admin = createAdminClient();
  const profile = {
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
    };
  const tenant = sub.metadata?.tenant_id ? await getTenantById(sub.metadata.tenant_id) : await getTenantBySlug("spring-ford");
  if (!tenant) throw new Error("Subscription publication not found");
  const { error: supportError } = await admin.from("support_subscriptions").upsert({subscription_id:sub.id,tenant_id:tenant.id,user_id:supabaseUserId,profile,updated_at:new Date().toISOString()},{onConflict:"subscription_id"});
  if (supportError) throw new Error("Could not synchronize support subscription");
  const { error } = await admin.from("user_profiles").update(profile).eq("id",supabaseUserId);

  if (error) {
    throw new Error("Failed to sync subscription to profile");
  }
}

export async function clearStripeSubscriptionFromProfile(subscriptionId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin.from("support_subscriptions").select("profile").eq("subscription_id",subscriptionId).maybeSingle();
  if (existingError) throw new Error("Could not load support subscription");
  if (existing) {
    const { error } = await admin.from("support_subscriptions").update({profile:{...existing.profile,support_subscription_status:"canceled",stripe_support_subscription_id:null,support_subscription_cancel_at_period_end:false},updated_at:new Date().toISOString()}).eq("subscription_id",subscriptionId);
    if (error) throw new Error("Could not synchronize ended subscription");
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
    throw new Error("Failed to clear subscription from profile");
  }
}
