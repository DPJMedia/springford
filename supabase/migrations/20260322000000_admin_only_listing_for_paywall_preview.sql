-- TEMPORARY: Allow everyone to SELECT published admin_only rows (same pattern as newsletter paywall).
-- Non-admins see title/header + paywall overlay; body stripped on the server.
-- Revert admin_only to admin-only RLS when finished testing (see prior migration policy).

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
    OR visibility = 'admin_only'
  )
);

COMMENT ON COLUMN articles.visibility IS 'public: all; newsletter_subscribers: list all, body for subscribers; admin_only: TEMP list all for paywall test, body for admins only';
