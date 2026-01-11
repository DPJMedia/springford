-- Migration: Update Ad Slots for New Article Layout
-- This adds new ad slots for the updated article page layout
-- Run this in your Supabase SQL Editor

-- Insert new ad slot settings (if they don't exist)
INSERT INTO ad_settings (ad_slot, use_fallback, fallback_ad_code)
VALUES 
  ('article-inline-1', true, 'diffuse-ai'),
  ('article-inline-2', true, 'diffuse-ai')
ON CONFLICT (ad_slot) DO NOTHING;

-- Note: The existing ad slots remain:
-- - homepage-banner
-- - homepage-sidebar
-- - article-sidebar
-- 
-- New ad slots added:
-- - article-inline-1 (first inline ad in article content)
-- - article-inline-2 (second inline ad in article content)
--
-- Old ad slot (if exists): article-inline
-- You can manually migrate any existing "article-inline" ads to "article-inline-1" if needed

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Ad slots updated successfully!';
  RAISE NOTICE 'New slots: article-inline-1, article-inline-2';
END $$;



