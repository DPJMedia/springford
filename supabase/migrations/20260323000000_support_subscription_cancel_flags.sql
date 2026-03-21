-- Track Stripe cancel_at_period_end + subscription start for profile UI
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_cancel_at_period_end BOOLEAN;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS support_subscription_started_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.support_subscription_cancel_at_period_end IS 'True when user canceled but period still active (no more charges after cancel_at)';
COMMENT ON COLUMN user_profiles.support_subscription_started_at IS 'Stripe subscription created time (recurring support start)';
