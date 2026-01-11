-- Migration: Add new homepage ad slots with unique identifiers
-- This allows admins to place ads in specific numbered sections
-- Run this in your Supabase SQL Editor

-- Insert new ad slot settings for homepage
INSERT INTO ad_settings (ad_slot, use_fallback, fallback_ad_code) VALUES
  ('homepage-banner-top', true, NULL),
  ('homepage-sidebar-top', true, NULL),
  ('homepage-sidebar-middle', true, NULL),
  ('homepage-sidebar-bottom', true, NULL),
  ('homepage-content-top', true, NULL),
  ('homepage-content-middle-1', true, NULL),
  ('homepage-content-middle-2', true, NULL),
  ('homepage-banner-bottom', true, NULL)
ON CONFLICT (ad_slot) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added homepage ad slots!';
  RAISE NOTICE 'Available slots:';
  RAISE NOTICE '  Section 1: homepage-banner-top (Banner Below Hero)';
  RAISE NOTICE '  Section 2: homepage-sidebar-top (Sidebar Top - Above Trending)';
  RAISE NOTICE '  Section 3: homepage-sidebar-middle (Sidebar Middle)';
  RAISE NOTICE '  Section 4: homepage-sidebar-bottom (Sidebar Bottom)';
  RAISE NOTICE '  Section 5: homepage-content-top (Main Content Top)';
  RAISE NOTICE '  Section 6: homepage-content-middle-1 (Main Content Middle 1)';
  RAISE NOTICE '  Section 7: homepage-content-middle-2 (Main Content Middle 2)';
  RAISE NOTICE '  Section 8: homepage-banner-bottom (Banner Bottom)';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins will see numbered labels on the homepage for easy identification.';
END $$;



