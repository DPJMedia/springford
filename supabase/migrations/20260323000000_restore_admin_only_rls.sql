-- Restore admin_only: only admins can SELECT published admin-only articles.
-- Newsletter-subscriber articles remain listable by everyone (body gated in app).

DROP POLICY IF EXISTS "Published articles visible by audience" ON articles;

CREATE POLICY "Published articles visible by audience" ON articles
FOR SELECT
TO public
USING (
  status = 'published'
  AND published_at <= now()
  AND (
    COALESCE(visibility, 'public') = 'public'
    OR visibility = 'newsletter_subscribers'
    OR (
      visibility = 'admin_only'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND (up.is_admin OR up.is_super_admin)
      )
    )
  )
);

COMMENT ON COLUMN articles.visibility IS 'public: all visitors; newsletter_subscribers: listed for all, full body for newsletter_subscribed; admin_only: admins/super_admins only (staff paywall preview in app until removed)';
