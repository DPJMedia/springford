-- ============================================
-- Analytics System Update - Run This in Supabase
-- ============================================
-- This adds enhanced tracking fields to existing tables
-- and creates new tables for author/section/scroll tracking
-- ============================================

-- Add enhanced tracking columns to page_views
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS scroll_depth_percent INTEGER DEFAULT 0;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS max_scroll_depth INTEGER DEFAULT 0;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS completed_article BOOLEAN DEFAULT false;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS exit_page BOOLEAN DEFAULT false;

-- Author click tracking
CREATE TABLE IF NOT EXISTS author_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  clicked_from_page TEXT,
  article_id UUID,
  user_id UUID,
  session_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_author_clicks_author ON author_clicks(author_name);
CREATE INDEX IF NOT EXISTS idx_author_clicks_session ON author_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_author_clicks_clicked_at ON author_clicks(clicked_at);

-- Section click tracking
CREATE TABLE IF NOT EXISTS section_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL,
  clicked_from_page TEXT,
  user_id UUID,
  session_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_clicks_section ON section_clicks(section_name);
CREATE INDEX IF NOT EXISTS idx_section_clicks_session ON section_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_section_clicks_clicked_at ON section_clicks(clicked_at);

-- Enhanced ad tracking columns
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS was_viewed BOOLEAN DEFAULT false;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS view_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS viewport_position TEXT;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS scroll_depth_when_viewed INTEGER;

-- Article scroll abandonment tracking
CREATE TABLE IF NOT EXISTS article_scroll_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  scroll_checkpoints JSONB,
  max_scroll_percent INTEGER,
  article_length_pixels INTEGER,
  time_spent_seconds INTEGER,
  abandoned_at_percent INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_scroll_data_article ON article_scroll_data(article_id);
CREATE INDEX IF NOT EXISTS idx_article_scroll_data_session ON article_scroll_data(session_id);
CREATE INDEX IF NOT EXISTS idx_article_scroll_data_created_at ON article_scroll_data(created_at);

-- Enable RLS for new tables
ALTER TABLE author_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_scroll_data ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
DROP POLICY IF EXISTS "Service role full access on author_clicks" ON author_clicks;
CREATE POLICY "Service role full access on author_clicks" ON author_clicks FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on section_clicks" ON section_clicks;
CREATE POLICY "Service role full access on section_clicks" ON section_clicks FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on article_scroll_data" ON article_scroll_data;
CREATE POLICY "Service role full access on article_scroll_data" ON article_scroll_data FOR ALL USING (true);

-- Verification query
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('page_views', 'ad_impressions', 'ad_clicks', 'author_clicks', 'section_clicks', 'article_scroll_data')
ORDER BY table_name;
