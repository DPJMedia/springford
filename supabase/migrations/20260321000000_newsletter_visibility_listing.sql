-- Newsletter-only articles: allow everyone to SELECT published rows (listing + article shell).
-- Full article body is stripped server-side for non-subscribers; subscribers read full content.
-- Admin-only remains restricted to admins.

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

COMMENT ON COLUMN articles.visibility IS 'public: all visitors; newsletter_subscribers: listed for all, full body for newsletter_subscribed only; admin_only: is_admin or is_super_admin';
