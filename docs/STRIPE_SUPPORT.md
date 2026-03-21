# Stripe support & recurring donations

## Dashboard setup

1. **Webhook** (Developers → Webhooks) — point to:
   `https://www.springford.press/api/webhooks/stripe`  
   (or your deployment URL)

2. **Subscribe to events:**
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

3. **Environment variables** (see `README.md`):
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (from the webhook endpoint; also used to sign cancel-from-email links if `SUPPORT_CANCEL_TOKEN_SECRET` is not set)
   - `SUPABASE_SERVICE_ROLE_KEY` — required so webhooks can update `user_profiles` with subscription data.
   - Optional: `SUPPORT_CANCEL_TOKEN_SECRET` — dedicated secret for HMAC cancel links in emails.

4. **Database** — run migrations on your Supabase project:
   - `20260322000000_support_subscriptions.sql` — Stripe subscription columns on `user_profiles`
   - `20260323000000_support_subscription_cancel_flags.sql` — `support_subscription_cancel_at_period_end`, `support_subscription_started_at` (profile UI + sync)

## Behavior

- **One-time:** Checkout `mode: payment` (unchanged).
- **Recurring:** Checkout `mode: subscription` with monthly or annual billing. Fixed-term (N months) sets `cancel_at` on the subscription **in the webhook** after checkout (Stripe Checkout does not accept `subscription_data.cancel_at`).
- Thank-you emails mention recurring when applicable; receipt links use Stripe’s hosted invoice for subscriptions when available.
- Users can **cancel recurring** from **Profile → Support** (cancels at end of current billing period).

## Customer portal (optional)

This implementation uses in-app cancel via the API. You can also enable the [Stripe Customer Portal](https://stripe.com/docs/customer-management/customer-portal) in the Dashboard if you want self-serve billing management; it is not required for the above flow.

## Verifying a cancellation in Stripe

1. **Billing → Subscriptions** — open the subscription (or **Customers** → pick the customer → **Subscriptions**).
2. Check:
   - **Status** — still `active` until the period ends if you chose “cancel at period end”; becomes `canceled` when it fully stops.
   - **Cancel at end of current period** — should be **Yes** after a successful cancel-at-period-end.
   - **Current period end** — last date you’re already billed through; you are **not** charged again after that for this subscription once cancellation is scheduled (no upcoming renewal invoice for the next cycle).
3. **Invoices** / **Upcoming invoice** — there should be no future recurring charge after the period that contains your cancellation.

## Troubleshooting dashboard errors

- If you see **`parameter_unknown` / `subscription_data[cancel_at]`** on `POST /v1/checkout/sessions`, that was from **older API requests** (Stripe Checkout does not accept `cancel_at` inside `subscription_data`). Current code applies fixed-term `cancel_at` **in the webhook** after the subscription is created. New checkouts should not produce this error once the latest app is deployed.
