-- ============================================
-- SPRINGFORD DATABASE - COMPLETE SETUP
-- ============================================
-- User Deletion + Analytics Tracking
-- ============================================

-- PART 1: SETUP SUPER ADMINS & USER DELETION
-- ============================================

-- Set super admin status for key users
UPDATE user_profiles SET is_super_admin = true WHERE email = 'dylancobb2525@gmail.com';
UPDATE user_profiles SET is_super_admin = true WHERE email = 'johnmcguire04@gmail.com';
UPDATE user_profiles SET is_super_admin = true WHERE email ILIKE '%prestonschlagheck@gmail.com%';

-- Create function to delete users (only super admins can use)
CREATE OR REPLACE FUNCTION delete_user_as_admin(user_id_to_delete UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_user_super_admin BOOLEAN;
BEGIN
  -- Check if current user is super admin
  SELECT is_super_admin INTO is_user_super_admin
  FROM user_profiles WHERE id = auth.uid();
  
  IF NOT is_user_super_admin THEN
    RAISE EXCEPTION 'Only super admins can delete users';
  END IF;
  
  -- Delete the user profile
  DELETE FROM user_profiles WHERE id = user_id_to_delete;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_as_admin(UUID) TO authenticated;

-- Add RLS policy for deletion
DROP POLICY IF EXISTS "Super admins can delete users" ON user_profiles;
CREATE POLICY "Super admins can delete users"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

SELECT 'Super admin setup complete!' AS status;

-- ============================================
-- PART 2: ANALYTICS TRACKING TABLES
-- ============================================

-- Page views table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID,
  user_id UUID,
  session_id TEXT NOT NULL,
  view_type TEXT NOT NULL,
  referrer_url TEXT,
  traffic_source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  scroll_depth_percent INTEGER DEFAULT 0,
  max_scroll_depth INTEGER DEFAULT 0,
  completed_article BOOLEAN DEFAULT false,
  exit_page BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_page_views_article ON page_views(article_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at);

-- Ad impressions table
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL,
  ad_slot TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  page_url TEXT,
  device_type TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  was_viewed BOOLEAN DEFAULT false,
  view_duration_seconds INTEGER DEFAULT 0,
  viewport_position TEXT,
  scroll_depth_when_viewed INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_slot ON ad_impressions(ad_slot);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_viewed_at ON ad_impressions(viewed_at);

-- Ad clicks table
CREATE TABLE IF NOT EXISTS ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL,
  ad_slot TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  page_url TEXT,
  device_type TEXT,
  destination_url TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad ON ad_clicks(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_slot ON ad_clicks(ad_slot);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_clicked_at ON ad_clicks(clicked_at);

-- Author clicks table
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

-- Section clicks table
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

-- Article scroll data table
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

SELECT 'Analytics tables created!' AS status;

-- ============================================
-- PART 3: RLS POLICIES FOR ANALYTICS
-- ============================================

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_scroll_data ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking)
DROP POLICY IF EXISTS "Allow inserts to page_views" ON page_views;
CREATE POLICY "Allow inserts to page_views" ON page_views FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow inserts to ad_impressions" ON ad_impressions;
CREATE POLICY "Allow inserts to ad_impressions" ON ad_impressions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow inserts to ad_clicks" ON ad_clicks;
CREATE POLICY "Allow inserts to ad_clicks" ON ad_clicks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow inserts to author_clicks" ON author_clicks;
CREATE POLICY "Allow inserts to author_clicks" ON author_clicks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow inserts to section_clicks" ON section_clicks;
CREATE POLICY "Allow inserts to section_clicks" ON section_clicks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow inserts to article_scroll_data" ON article_scroll_data;
CREATE POLICY "Allow inserts to article_scroll_data" ON article_scroll_data FOR INSERT WITH CHECK (true);

-- Allow service role to read everything
DROP POLICY IF EXISTS "Service role access page_views" ON page_views;
CREATE POLICY "Service role access page_views" ON page_views FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access ad_impressions" ON ad_impressions;
CREATE POLICY "Service role access ad_impressions" ON ad_impressions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access ad_clicks" ON ad_clicks;
CREATE POLICY "Service role access ad_clicks" ON ad_clicks FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access author_clicks" ON author_clicks;
CREATE POLICY "Service role access author_clicks" ON author_clicks FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access section_clicks" ON section_clicks;
CREATE POLICY "Service role access section_clicks" ON section_clicks FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access article_scroll_data" ON article_scroll_data;
CREATE POLICY "Service role access article_scroll_data" ON article_scroll_data FOR ALL USING (true);

SELECT 'RLS policies configured!' AS status;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show super admins
SELECT 'Super Admins:' AS info, full_name, email FROM user_profiles WHERE is_super_admin = true;

-- Show analytics tables
SELECT 'Analytics tables:' AS info, table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('page_views', 'ad_impressions', 'ad_clicks', 'author_clicks', 'section_clicks', 'article_scroll_data')
ORDER BY table_name;

SELECT '✅ SETUP COMPLETE - Ready to use!' AS status;
