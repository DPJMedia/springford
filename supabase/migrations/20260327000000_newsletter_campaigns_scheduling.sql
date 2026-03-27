-- Add scheduling and recipients fields to newsletter_campaigns
-- (IF NOT EXISTS guards mean safe to run even if columns already exist)

ALTER TABLE newsletter_campaigns
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipients_type text NOT NULL DEFAULT 'newsletter',
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}';
