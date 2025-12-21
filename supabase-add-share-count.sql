-- Add share_count column to articles table
-- Run this in your Supabase SQL Editor

-- Step 1: Add share_count column
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Step 2: Create function to increment share count
CREATE OR REPLACE FUNCTION increment_article_shares(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET share_count = share_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION increment_article_shares(UUID) TO anon, authenticated;

-- Step 4: Update the published_articles view to include share_count
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
  share_count,
  is_featured,
  is_breaking,
  use_featured_image
FROM public.articles
WHERE status = 'published' AND published_at <= NOW()
ORDER BY published_at DESC;

-- Grant permissions
GRANT SELECT ON public.published_articles TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Share count column and function added successfully!';
END $$;

