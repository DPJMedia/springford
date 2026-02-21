-- Track when user subscribed to newsletter
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed_at TIMESTAMPTZ;
