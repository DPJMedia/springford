-- COMPREHENSIVE ARTICLE MANAGEMENT SCHEMA UPDATE
-- Run this in your Supabase SQL Editor

-- First, drop the existing articles table if it exists and recreate with full functionality
DROP TABLE IF EXISTS public.articles CASCADE;

-- Create articles table with comprehensive fields
CREATE TABLE public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Content fields
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content TEXT NOT NULL, -- Rich text content (HTML)
  
  -- Media
  image_url TEXT,
  image_caption TEXT,
  image_credit TEXT,
  
  -- Publishing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  -- Organization
  section TEXT NOT NULL DEFAULT 'general' CHECK (section IN ('hero', 'world', 'local', 'sports', 'business', 'politics', 'technology', 'entertainment', 'opinion', 'general')),
  category TEXT,
  tags TEXT[],
  
  -- Author (link to user_profiles)
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  
  -- Features
  is_featured BOOLEAN DEFAULT FALSE,
  is_breaking BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  
  -- Moderation
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_section ON public.articles(section);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX idx_articles_author ON public.articles(author_id);
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_featured ON public.articles(is_featured) WHERE is_featured = true;
CREATE INDEX idx_articles_breaking ON public.articles(is_breaking) WHERE is_breaking = true;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_updated_at ON public.articles;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to auto-publish scheduled articles
CREATE OR REPLACE FUNCTION auto_publish_scheduled_articles()
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET status = 'published',
      published_at = scheduled_for
  WHERE status = 'scheduled'
    AND scheduled_for <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Storage bucket for article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for article images
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update article images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete article images" ON storage.objects;

CREATE POLICY "Anyone can view article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Admins can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'article-images' 
  AND auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

CREATE POLICY "Admins can update article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'article-images' 
  AND auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

CREATE POLICY "Admins can delete article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'article-images' 
  AND auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

-- Row Level Security for articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can view all articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can insert articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can update articles" ON public.articles;
DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;

-- Policy: Anyone can view published articles
CREATE POLICY "Anyone can view published articles"
ON public.articles FOR SELECT
USING (status = 'published' AND published_at <= NOW());

-- Policy: Admins can view all articles
CREATE POLICY "Admins can view all articles"
ON public.articles FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

-- Policy: Admins can insert articles
CREATE POLICY "Admins can insert articles"
ON public.articles FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

-- Policy: Admins can update articles
CREATE POLICY "Admins can update articles"
ON public.articles FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

-- Policy: Admins can delete articles
CREATE POLICY "Admins can delete articles"
ON public.articles FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

-- Create a view for public articles (useful for homepage)
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
  image_url,
  image_caption,
  published_at,
  section,
  category,
  tags,
  author_name,
  view_count,
  is_featured,
  is_breaking
FROM public.articles
WHERE status = 'published' AND published_at <= NOW()
ORDER BY published_at DESC;

-- Grant permissions
GRANT SELECT ON public.published_articles TO anon, authenticated;
GRANT ALL ON public.articles TO authenticated;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Articles table and storage setup completed successfully!';
END $$;

