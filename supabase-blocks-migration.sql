-- MIGRATION: Add support for content blocks and multiple sections
-- This is SAFE and won't break existing articles

-- Step 1: Add new columns for block-based content
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS sections TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS use_featured_image BOOLEAN DEFAULT true;

-- Step 2: Migrate existing articles to new format
-- Convert existing content to a single text block
UPDATE public.articles
SET content_blocks = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'text',
    'content', content,
    'order', 0
  )
)
WHERE content_blocks = '[]'::jsonb AND content IS NOT NULL AND content != '';

-- Step 3: Migrate existing section to sections array
UPDATE public.articles
SET sections = ARRAY[section]
WHERE sections = ARRAY[]::TEXT[] AND section IS NOT NULL;

-- Step 4: Add index for better performance on sections array
CREATE INDEX IF NOT EXISTS idx_articles_sections ON public.articles USING GIN(sections);

-- Step 5: Create function to check if article is in section
CREATE OR REPLACE FUNCTION article_in_section(article_sections TEXT[], search_section TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN search_section = ANY(article_sections);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Update the published_articles view to handle multiple sections
DROP VIEW IF EXISTS public.published_articles;
CREATE OR REPLACE VIEW public.published_articles AS
SELECT 
  id,
  created_at,
  updated_at,
  title,
  slug,
  subtitle,
  excerpt,
  content,
  content_blocks,
  image_url,
  image_caption,
  published_at,
  section,
  sections,
  category,
  tags,
  author_name,
  view_count,
  is_featured,
  is_breaking,
  use_featured_image
FROM public.articles
WHERE status = 'published' AND published_at <= NOW()
ORDER BY published_at DESC;

-- Grant permissions
GRANT SELECT ON public.published_articles TO anon, authenticated;

-- Add helpful comment
COMMENT ON COLUMN public.articles.content_blocks IS 'Array of content blocks: [{"type": "text"|"image", "content": "...", "url": "...", "caption": "...", "credit": "..."}]';
COMMENT ON COLUMN public.articles.sections IS 'Array of sections this article appears in (can be multiple)';
COMMENT ON COLUMN public.articles.use_featured_image IS 'Whether to display the featured image as article cover';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete! Articles now support:';
  RAISE NOTICE '   - Content blocks (text + images in any order)';
  RAISE NOTICE '   - Multiple sections per article';
  RAISE NOTICE '   - Featured image toggle';
  RAISE NOTICE '   - All existing articles preserved';
END $$;

