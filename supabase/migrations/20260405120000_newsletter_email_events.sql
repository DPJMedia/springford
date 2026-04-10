-- Per-recipient SendGrid events (opens, clicks, bounces, etc.) for newsletter campaigns.
-- Populated by POST /api/webhooks/sendgrid when Event Webhook is configured in SendGrid.

CREATE TABLE IF NOT EXISTS newsletter_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  event TEXT NOT NULL,
  url TEXT,
  reason TEXT,
  sg_event_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_events_sg_event_id_uidx
  ON newsletter_email_events (sg_event_id)
  WHERE sg_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS newsletter_email_events_campaign_occurred_idx
  ON newsletter_email_events (campaign_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS newsletter_email_events_email_idx
  ON newsletter_email_events (email);

ALTER TABLE newsletter_email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_email_events_admin_select"
  ON newsletter_email_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
    )
  );

COMMENT ON TABLE newsletter_email_events IS 'SendGrid Event Webhook payloads for newsletter sends; requires webhook URL + tagging sends with custom_args campaign_id.';
