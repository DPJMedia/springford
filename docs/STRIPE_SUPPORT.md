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
   - `STRIPE_WEBHOOK_SECRET` (from the webhook endpoint)
   - `SUPABASE_SERVICE_ROLE_KEY` — required so webhooks can update `user_profiles` with subscription data.

4. **Database** — run migration `20260322000000_support_subscriptions.sql` on your Supabase project (adds Stripe subscription columns to `user_profiles`).

## Behavior

- **One-time:** Checkout `mode: payment` (unchanged).
- **Recurring:** Checkout `mode: subscription` with monthly or annual billing; optional fixed term (N months) uses Stripe `cancel_at`.
- Thank-you emails mention recurring when applicable; receipt links use Stripe’s hosted invoice for subscriptions when available.
- Users can **cancel recurring** from **Profile → Support** (cancels at end of current billing period).

## Customer portal (optional)

This implementation uses in-app cancel via the API. You can also enable the [Stripe Customer Portal](https://stripe.com/docs/customer-management/customer-portal) in the Dashboard if you want self-serve billing management; it is not required for the above flow.
