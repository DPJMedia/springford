-- Who can see a published article on the public site (drafts unchanged: admin policies only)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'newsletter_subscribers', 'admin_only'));

COMMENT ON COLUMN articles.visibility IS 'public: all visitors; newsletter_subscribers: logged-in users with newsletter_subscribed; admin_only: is_admin or is_super_admin';

DROP POLICY IF EXISTS "Anyone can view published articles" ON articles;

CREATE POLICY "Published articles visible by audience" ON articles
FOR SELECT
TO public
USING (
  status = 'published'
  AND published_at <= now()
  AND (
    COALESCE(visibility, 'public') = 'public'
    OR (
      visibility = 'newsletter_subscribers'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.newsletter_subscribed = true
      )
    )
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

-- Full-text search must respect RLS (caller privileges), not bypass with DEFINER
CREATE OR REPLACE FUNCTION search_articles(search_query text)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  image_url text,
  author_name text,
  published_at timestamptz,
  category text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.slug,
    a.excerpt,
    a.image_url,
    a.author_name,
    a.published_at,
    a.category
  FROM articles a
  WHERE a.status = 'published'
    AND a.published_at IS NOT NULL
    AND a.published_at <= now()
    AND length(trim(search_query)) >= 2
    AND to_tsvector('english',
      coalesce(a.title, '') || ' ' ||
      coalesce(a.excerpt, '') || ' ' ||
      coalesce(a.meta_title, '') || ' ' ||
      coalesce(a.meta_description, '') || ' ' ||
      coalesce(a.content, '') || ' ' ||
      coalesce(a.category, '') || ' ' ||
      coalesce(a.subtitle, '')
    ) @@ plainto_tsquery('english', search_query)
  ORDER BY a.published_at DESC
  LIMIT 50;
END;
$$;
