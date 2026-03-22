-- Align saved quotes with live quoter: view-mix snapshots + manual total flag

ALTER TABLE saved_ad_quotes
  ADD COLUMN IF NOT EXISTS homepage_views_snapshot INTEGER,
  ADD COLUMN IF NOT EXISTS article_views_snapshot INTEGER,
  ADD COLUMN IF NOT EXISTS manual_total_override BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN saved_ad_quotes.homepage_views_snapshot IS 'Last-30d homepage view count at save (for quote reproduction)';
COMMENT ON COLUMN saved_ad_quotes.article_views_snapshot IS 'Last-30d article view count at save (for article rate nudge)';
COMMENT ON COLUMN saved_ad_quotes.manual_total_override IS 'True when total_usd was set without full package math (e.g. edited price)';
