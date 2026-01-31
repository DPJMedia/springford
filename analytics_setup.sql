-- Analytics Tracking Tables for Springford Press
-- Run these SQL statements in your Supabase SQL Editor

-- ============================================
-- 1. Page Views Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID, -- Will be linked to articles table if it exists
  user_id UUID, -- Will be linked to user_profiles table if it exists
  session_id TEXT, -- For tracking unique visitors
  view_type TEXT NOT NULL, -- 'article', 'homepage', 'section', 'author', 'tag'
  
  -- Traffic source tracking
  referrer_url TEXT,
  traffic_source TEXT, -- 'direct', 'social', 'search', 'referral', 'shared_link'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Device & location
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  
  -- Metadata
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_view_type CHECK (view_type IN ('article', 'homepage', 'section', 'author', 'tag', 'other'))
);

CREATE INDEX idx_page_views_article ON page_views(article_id);
CREATE INDEX idx_page_views_user ON page_views(user_id);
CREATE INDEX idx_page_views_session ON page_views(session_id);
CREATE INDEX idx_page_views_viewed_at ON page_views(viewed_at);
CREATE INDEX idx_page_views_traffic_source ON page_views(traffic_source);

-- Add foreign key constraints if the related tables exist
DO $$
BEGIN
  -- Add article_id foreign key if articles table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'articles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'page_views_article_id_fkey' 
      AND table_name = 'page_views'
    ) THEN
      ALTER TABLE page_views 
      ADD CONSTRAINT page_views_article_id_fkey 
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint: page_views -> articles';
    END IF;
  END IF;

  -- Add user_id foreign key if user_profiles table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'page_views_user_id_fkey' 
      AND table_name = 'page_views'
    ) THEN
      ALTER TABLE page_views 
      ADD CONSTRAINT page_views_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint: page_views -> user_profiles';
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. Ad Impressions & Clicks Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID, -- Will be linked to ads table if it exists
  ad_slot TEXT NOT NULL,
  user_id UUID, -- Will be linked to user_profiles table if it exists
  session_id TEXT,
  
  -- Impression metadata
  page_url TEXT,
  device_type TEXT,
  
  -- Timestamps
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_impressions_ad ON ad_impressions(ad_id);
CREATE INDEX idx_ad_impressions_slot ON ad_impressions(ad_slot);
CREATE INDEX idx_ad_impressions_viewed_at ON ad_impressions(viewed_at);

CREATE TABLE IF NOT EXISTS ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID, -- Will be linked to ads table if it exists
  ad_slot TEXT NOT NULL,
  user_id UUID, -- Will be linked to user_profiles table if it exists
  session_id TEXT,
  
  -- Click metadata
  page_url TEXT,
  device_type TEXT,
  destination_url TEXT,
  
  -- Timestamps
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_clicks_ad ON ad_clicks(ad_id);
CREATE INDEX idx_ad_clicks_slot ON ad_clicks(ad_slot);
CREATE INDEX idx_ad_clicks_clicked_at ON ad_clicks(clicked_at);

-- Add foreign key constraints for ad tables if they exist
DO $$
BEGIN
  -- Add ad_id foreign keys if ads table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ads') THEN
    -- For ad_impressions
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ad_impressions_ad_id_fkey' 
      AND table_name = 'ad_impressions'
    ) THEN
      ALTER TABLE ad_impressions 
      ADD CONSTRAINT ad_impressions_ad_id_fkey 
      FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint: ad_impressions -> ads';
    END IF;

    -- For ad_clicks
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ad_clicks_ad_id_fkey' 
      AND table_name = 'ad_clicks'
    ) THEN
      ALTER TABLE ad_clicks 
      ADD CONSTRAINT ad_clicks_ad_id_fkey 
      FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint: ad_clicks -> ads';
    END IF;
  END IF;

  -- Add user_id foreign keys if user_profiles table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    -- For ad_impressions
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ad_impressions_user_id_fkey' 
      AND table_name = 'ad_impressions'
    ) THEN
      ALTER TABLE ad_impressions 
      ADD CONSTRAINT ad_impressions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint: ad_impressions -> user_profiles';
    END IF;

    -- For ad_clicks
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ad_clicks_user_id_fkey' 
      AND table_name = 'ad_clicks'
    ) THEN
      ALTER TABLE ad_clicks 
      ADD CONSTRAINT ad_clicks_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint: ad_clicks -> user_profiles';
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. User Activity Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Will be linked to user_profiles table if it exists
  activity_type TEXT NOT NULL, -- 'login', 'article_view', 'comment', 'share', 'newsletter_signup'
  
  -- Related entities
  article_id UUID, -- Will be linked to articles table if it exists
  
  -- Metadata
  metadata JSONB, -- Flexible for additional data
  
  -- Timestamps
  activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_type ON user_activity_log(activity_type);
CREATE INDEX idx_user_activity_at ON user_activity_log(activity_at);

-- Add foreign key constraints for user_activity_log if related tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_activity_log_user_id_fkey' 
      AND table_name = 'user_activity_log'
    ) THEN
      ALTER TABLE user_activity_log 
      ADD CONSTRAINT user_activity_log_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint: user_activity_log -> user_profiles';
    END IF;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'articles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'user_activity_log_article_id_fkey' 
      AND table_name = 'user_activity_log'
    ) THEN
      ALTER TABLE user_activity_log 
      ADD CONSTRAINT user_activity_log_article_id_fkey 
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint: user_activity_log -> articles';
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. Daily Analytics Summary (for quick queries)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- Article metrics
  total_page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  authenticated_views INT DEFAULT 0,
  anonymous_views INT DEFAULT 0,
  
  -- Traffic sources
  direct_traffic INT DEFAULT 0,
  social_traffic INT DEFAULT 0,
  search_traffic INT DEFAULT 0,
  referral_traffic INT DEFAULT 0,
  shared_link_traffic INT DEFAULT 0,
  
  -- Ad metrics
  total_ad_impressions INT DEFAULT 0,
  total_ad_clicks INT DEFAULT 0,
  
  -- User metrics
  new_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  new_newsletter_subscribers INT DEFAULT 0,
  
  -- Device breakdown
  desktop_views INT DEFAULT 0,
  mobile_views INT DEFAULT 0,
  tablet_views INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_analytics_date ON daily_analytics(date);

-- ============================================
-- 5. Real-time Active Users (for current visitors)
-- ============================================
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID, -- Will be linked to user_profiles table if it exists
  
  -- Current page
  current_page TEXT,
  
  -- Device info
  device_type TEXT,
  user_agent TEXT,
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_last_active ON active_sessions(last_active_at);

-- Add foreign key constraint for active_sessions if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'active_sessions_user_id_fkey' 
      AND table_name = 'active_sessions'
    ) THEN
      ALTER TABLE active_sessions 
      ADD CONSTRAINT active_sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint: active_sessions -> user_profiles';
    END IF;
  END IF;
END $$;

-- Clean up old sessions (older than 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM active_sessions 
  WHERE last_active_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Enable Row Level Security (RLS)
-- ============================================
-- Note: We're keeping RLS simple - only service role can access these tables
-- Your application code (which uses service role) will handle admin permissions

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (this is what your app uses)
CREATE POLICY "Service role full access on page_views" ON page_views FOR ALL USING (true);
CREATE POLICY "Service role full access on ad_impressions" ON ad_impressions FOR ALL USING (true);
CREATE POLICY "Service role full access on ad_clicks" ON ad_clicks FOR ALL USING (true);
CREATE POLICY "Service role full access on user_activity_log" ON user_activity_log FOR ALL USING (true);
CREATE POLICY "Service role full access on daily_analytics" ON daily_analytics FOR ALL USING (true);
CREATE POLICY "Service role full access on active_sessions" ON active_sessions FOR ALL USING (true);

-- ============================================
-- 7. Helpful Views for Common Queries
-- ============================================
-- NOTE: These views are optional and will be created only if the required tables exist
-- If you get errors here, it means you need to create the articles/ads tables first

-- Top articles by views (last 30 days)
-- Only create this view if the articles table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'articles') THEN
    CREATE OR REPLACE VIEW top_articles_30d AS
    SELECT 
      a.id,
      a.title,
      a.slug,
      a.section,
      a.author_name,
      COUNT(pv.id) as view_count,
      COUNT(DISTINCT pv.session_id) as unique_visitors
    FROM articles a
    LEFT JOIN page_views pv ON a.id = pv.article_id
    WHERE pv.viewed_at >= NOW() - INTERVAL '30 days'
    GROUP BY a.id, a.title, a.slug, a.section, a.author_name
    ORDER BY view_count DESC
    LIMIT 50;
    
    RAISE NOTICE 'Created view: top_articles_30d';
  ELSE
    RAISE NOTICE 'Skipped view: top_articles_30d (articles table does not exist)';
  END IF;
END $$;

-- Ad performance summary
-- Only create this view if the ads table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ads') THEN
    CREATE OR REPLACE VIEW ad_performance_summary AS
    SELECT 
      a.id,
      a.title,
      a.ad_slot,
      a.is_active,
      COUNT(DISTINCT i.id) as impressions,
      COUNT(DISTINCT c.id) as clicks,
      CASE 
        WHEN COUNT(DISTINCT i.id) > 0 
        THEN ROUND((COUNT(DISTINCT c.id)::DECIMAL / COUNT(DISTINCT i.id) * 100), 2)
        ELSE 0 
      END as ctr_percentage
    FROM ads a
    LEFT JOIN ad_impressions i ON a.id = i.ad_id
    LEFT JOIN ad_clicks c ON a.id = c.ad_id
    GROUP BY a.id, a.title, a.ad_slot, a.is_active
    ORDER BY impressions DESC;
    
    RAISE NOTICE 'Created view: ad_performance_summary';
  ELSE
    RAISE NOTICE 'Skipped view: ad_performance_summary (ads table does not exist)';
  END IF;
END $$;

-- Traffic sources last 7 days
CREATE OR REPLACE VIEW traffic_sources_7d AS
SELECT 
  traffic_source,
  COUNT(*) as views,
  COUNT(DISTINCT session_id) as unique_visitors
FROM page_views
WHERE viewed_at >= NOW() - INTERVAL '7 days'
GROUP BY traffic_source
ORDER BY views DESC;

-- ============================================
-- 8. Enhanced Tracking Fields & Tables
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

CREATE INDEX idx_author_clicks_author ON author_clicks(author_name);
CREATE INDEX idx_author_clicks_session ON author_clicks(session_id);
CREATE INDEX idx_author_clicks_clicked_at ON author_clicks(clicked_at);

-- Section click tracking
CREATE TABLE IF NOT EXISTS section_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL,
  clicked_from_page TEXT,
  user_id UUID,
  session_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_section_clicks_section ON section_clicks(section_name);
CREATE INDEX idx_section_clicks_session ON section_clicks(session_id);
CREATE INDEX idx_section_clicks_clicked_at ON section_clicks(clicked_at);

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

CREATE INDEX idx_article_scroll_data_article ON article_scroll_data(article_id);
CREATE INDEX idx_article_scroll_data_session ON article_scroll_data(session_id);
CREATE INDEX idx_article_scroll_data_created_at ON article_scroll_data(created_at);

-- Enable RLS for new tables
ALTER TABLE author_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_scroll_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on author_clicks" ON author_clicks FOR ALL USING (true);
CREATE POLICY "Service role full access on section_clicks" ON section_clicks FOR ALL USING (true);
CREATE POLICY "Service role full access on article_scroll_data" ON article_scroll_data FOR ALL USING (true);

-- ============================================
-- DONE! Your analytics tables are ready!
-- ============================================

-- To verify everything was created successfully:
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('page_views', 'ad_impressions', 'ad_clicks', 'user_activity_log', 'daily_analytics', 'active_sessions', 'author_clicks', 'section_clicks', 'article_scroll_data')
ORDER BY table_name;
