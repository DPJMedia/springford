-- Migration: Add New Article Sidebar Ad Slots
-- This adds two new ad slots for the article sidebar layout
-- Run this in your Supabase SQL Editor

-- Insert new ad slot settings
INSERT INTO ad_settings (ad_slot, use_fallback, fallback_ad_code)
VALUES 
  ('article-sidebar-top', true, 'diffuse-ai'),
  ('article-sidebar-bottom', true, 'diffuse-ai')
ON CONFLICT (ad_slot) DO NOTHING;

-- Note: The article sidebar now has 2 dedicated ad slots:
-- - article-sidebar-top: Large ad at top of sidebar (320px height, 336x280 recommended)
-- - article-sidebar-bottom: Medium ad below recommended stories (256px height, 300x250 recommended)
--
-- The old "article-sidebar" slot can be deprecated or kept for backwards compatibility
-- Inline ad slots remain: article-inline-1, article-inline-2

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Article sidebar ad slots created successfully!';
  RAISE NOTICE 'New slots: article-sidebar-top (large), article-sidebar-bottom (medium)';
  RAISE NOTICE 'Recommended Stories section will appear between these two ads';
END $$;

