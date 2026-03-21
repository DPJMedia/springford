-- Stripe recurring support / donations (linked from checkout + webhooks)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_support_subscription_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_status TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_interval TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_cancel_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe Customer id for support subscriptions';
COMMENT ON COLUMN user_profiles.stripe_support_subscription_id IS 'Active Stripe Subscription id for recurring support';
COMMENT ON COLUMN user_profiles.support_subscription_status IS 'Stripe subscription status: active, canceled, past_due, etc.';
COMMENT ON COLUMN user_profiles.support_subscription_interval IS 'month or year';
COMMENT ON COLUMN user_profiles.support_subscription_current_period_end IS 'End of current billing period';
COMMENT ON COLUMN user_profiles.support_subscription_cancel_at IS 'When subscription will end (limited term or cancel_at_period_end)';

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_amount_cents INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_plan TEXT;
