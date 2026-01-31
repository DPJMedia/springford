-- ============================================
-- Add Location Tracking to Analytics Tables
-- ============================================
-- Adds city, state, country, postal_code columns to analytics tables

-- Add all location columns to page_views
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add all location columns to ad_impressions
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add indexes for fast location-based queries
CREATE INDEX IF NOT EXISTS idx_page_views_city ON page_views(city);
CREATE INDEX IF NOT EXISTS idx_page_views_state ON page_views(state);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_city ON ad_impressions(city);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_state ON ad_impressions(state);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_country ON ad_impressions(country);
