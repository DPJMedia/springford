-- ============================================
-- CLEANUP SCRIPT FOR WRONG DATABASE (Diffuse)
-- ============================================
-- Run this in the DIFFUSE database to remove analytics tables
-- that were accidentally created there
-- ============================================

-- WARNING: Only run this in the DIFFUSE database, NOT Springford!
-- Verify first by checking what tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- If you see analytics tables (page_views, ad_impressions, etc.) 
-- in the diffuse database, run the commands below:

-- ============================================
-- DROP ANALYTICS TABLES (if they exist)
-- ============================================

DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS ad_impressions CASCADE;
DROP TABLE IF EXISTS ad_clicks CASCADE;
DROP TABLE IF EXISTS author_clicks CASCADE;
DROP TABLE IF EXISTS section_clicks CASCADE;
DROP TABLE IF EXISTS article_scroll_data CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS daily_analytics CASCADE;
DROP TABLE IF EXISTS active_sessions CASCADE;

-- ============================================
-- DROP FUNCTIONS (if they exist)
-- ============================================

DROP FUNCTION IF EXISTS delete_user_as_admin(UUID) CASCADE;

-- ============================================
-- DROP VIEWS (if they exist)
-- ============================================

DROP VIEW IF EXISTS top_articles_30d CASCADE;
DROP VIEW IF EXISTS ad_performance_summary CASCADE;
DROP VIEW IF EXISTS traffic_sources_7d CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show remaining tables (should NOT include analytics tables)
SELECT 'Remaining tables in database:' AS info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT '✅ Cleanup complete!' AS status;
