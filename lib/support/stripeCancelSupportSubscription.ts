import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Stops future charges: prefers end of current billing period; falls back to immediate cancel if Stripe rejects.
 * Returns whether Stripe was updated (vs already canceled / already scheduled).
 */
export async function cancelSupportSubscription(
  subscriptionId: string
): Promise<"updated" | "noop"> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    return "noop";
  }
  if (sub.cancel_at_period_end) {
    return "noop";
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return "updated";
  } catch (err) {
    console.warn(
      "cancel_at_period_end failed, trying immediate cancel:",
      err instanceof Error ? err.message : err
    );
    await stripe.subscriptions.cancel(subscriptionId);
    return "updated";
  }
}
