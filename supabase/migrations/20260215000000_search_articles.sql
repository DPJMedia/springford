-- Full-text search function for articles
-- Uses PostgreSQL full-text search so "car" matches the word "car" but not "carbon", "scar", etc.

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
SECURITY DEFINER
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
