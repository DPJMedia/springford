-- ============================================
-- 0. Drop any trigger that auto-updates updated_at on articles (prevents view from changing it)
-- ============================================
DROP TRIGGER IF EXISTS set_updated_at ON articles;
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
DROP TRIGGER IF EXISTS articles_updated_at ON articles;

-- ============================================
-- 1. Fix increment_article_views: ONLY update view_count, NEVER touch updated_at
-- ============================================
-- Viewing an article should not change updated_at. Only actual edits should.
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only increment view_count; explicitly preserve updated_at to avoid false "edit" timestamps
  UPDATE articles
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = updated_at  -- keep unchanged
  WHERE id = article_id;
END;
$$;

-- ============================================
-- 2. Notifications table (for admins)
-- ============================================
-- Types: ad_published, ad_expired_deleted, article_published, article_edited
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'ad')),
  target_id UUID,
  actor_name TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- If table already exists with old schema: add columns, relax type constraint
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. Helper: Notify all admins
-- ============================================
CREATE OR REPLACE FUNCTION notify_admins(
  p_type TEXT,
  p_message TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_actor_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, message, target_type, target_id, actor_name)
  SELECT id, p_type, p_message, p_target_type, p_target_id, p_actor_name
  FROM user_profiles
  WHERE is_admin = true OR is_super_admin = true;
END;
$$;

-- ============================================
-- 4. Trigger: Article published (from draft/scheduled to published, or INSERT as published)
-- ============================================
CREATE OR REPLACE FUNCTION notify_article_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name_val TEXT;
BEGIN
  -- Fire when status is published and (INSERT or status changed from non-published)
  IF NEW.status = 'published' AND (
    TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status != 'published'))
  ) THEN
    SELECT full_name INTO actor_name_val FROM user_profiles WHERE id = NEW.updated_by;
    IF actor_name_val IS NULL AND NEW.updated_by IS NOT NULL THEN
      actor_name_val := 'Unknown';
    ELSIF actor_name_val IS NULL THEN
      actor_name_val := 'System';
    END IF;
    PERFORM notify_admins(
      'article_published',
      'Article "' || COALESCE(NEW.title, 'Untitled') || '" was published by ' || actor_name_val,
      'article',
      NEW.id,
      actor_name_val
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_article_published ON articles;
CREATE TRIGGER trg_notify_article_published
  AFTER INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION notify_article_published();

-- ============================================
-- 5. Trigger: Article edited (actual content/field change, NOT view-only)
-- ============================================
-- Only fire when content or key fields change; NOT when only view_count changes
CREATE OR REPLACE FUNCTION notify_article_edited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name_val TEXT;
  is_real_edit BOOLEAN := false;
BEGIN
  -- Must be an actual edit: status is published AND something besides view_count/updated_at changed
  IF NEW.status != 'published' THEN
    RETURN NEW;
  END IF;
  IF OLD.status != 'published' THEN
    RETURN NEW;  -- status change handled by publish trigger
  END IF;

  -- Check if meaningful fields changed (exclude view_count, updated_at, updated_by)
  IF OLD.title IS DISTINCT FROM NEW.title
     OR OLD.slug IS DISTINCT FROM NEW.slug
     OR OLD.subtitle IS DISTINCT FROM NEW.subtitle
     OR OLD.excerpt IS DISTINCT FROM NEW.excerpt
     OR OLD.content IS DISTINCT FROM NEW.content
     OR OLD.content_blocks IS DISTINCT FROM NEW.content_blocks
     OR OLD.image_url IS DISTINCT FROM NEW.image_url
     OR OLD.section IS DISTINCT FROM NEW.section
     OR OLD.sections IS DISTINCT FROM NEW.sections
     OR OLD.category IS DISTINCT FROM NEW.category
     OR OLD.tags IS DISTINCT FROM NEW.tags
     OR OLD.author_name IS DISTINCT FROM NEW.author_name
     OR OLD.meta_title IS DISTINCT FROM NEW.meta_title
     OR OLD.meta_description IS DISTINCT FROM NEW.meta_description
     OR OLD.is_featured IS DISTINCT FROM NEW.is_featured
     OR OLD.is_breaking IS DISTINCT FROM NEW.is_breaking
  THEN
    is_real_edit := true;
  END IF;

  IF is_real_edit THEN
    SELECT full_name INTO actor_name_val FROM user_profiles WHERE id = NEW.updated_by;
    IF actor_name_val IS NULL THEN actor_name_val := 'Unknown'; END IF;
    PERFORM notify_admins(
      'article_edited',
      'Article "' || COALESCE(NEW.title, 'Untitled') || '" was edited by ' || actor_name_val,
      'article',
      NEW.id,
      actor_name_val
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_article_edited ON articles;
CREATE TRIGGER trg_notify_article_edited
  AFTER UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION notify_article_edited();

-- ============================================
-- 6. Trigger: Ad published / created as active
-- ============================================
CREATE OR REPLACE FUNCTION notify_ad_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name_val TEXT;
BEGIN
  IF NEW.is_active = true AND (OLD.is_active = false OR OLD IS NULL) THEN
    SELECT full_name INTO actor_name_val FROM user_profiles WHERE id = NEW.created_by;
    IF actor_name_val IS NULL THEN actor_name_val := 'Unknown'; END IF;
    PERFORM notify_admins(
      'ad_published',
      'Ad "' || COALESCE(NEW.title, 'Untitled') || '" was published by ' || actor_name_val,
      'ad',
      NEW.id,
      actor_name_val
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ad_published ON ads;
CREATE TRIGGER trg_notify_ad_published
  AFTER INSERT OR UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION notify_ad_published();

-- ============================================
-- 7. Trigger: Ad expired or deleted
-- ============================================
CREATE OR REPLACE FUNCTION notify_ad_expired_or_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name_val TEXT;
  msg TEXT;
BEGIN
  -- Deleted
  IF TG_OP = 'DELETE' THEN
    actor_name_val := COALESCE(
      (SELECT full_name FROM user_profiles WHERE id = auth.uid()),
      'Unknown'
    );
    msg := 'Ad "' || COALESCE(OLD.title, 'Untitled') || '" was deleted by ' || actor_name_val;
    PERFORM notify_admins('ad_expired_deleted', msg, 'ad', OLD.id, actor_name_val);
    RETURN OLD;
  END IF;

  -- Expired / deactivated
  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    SELECT full_name INTO actor_name_val FROM user_profiles WHERE id = auth.uid();
    IF actor_name_val IS NULL THEN actor_name_val := 'System'; END IF;
    msg := 'Ad "' || COALESCE(NEW.title, 'Untitled') || '" was expired/deactivated by ' || actor_name_val;
    PERFORM notify_admins('ad_expired_deleted', msg, 'ad', NEW.id, actor_name_val);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ad_expired_deleted ON ads;
CREATE TRIGGER trg_notify_ad_expired_deleted
  AFTER UPDATE OR DELETE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION notify_ad_expired_or_deleted();
