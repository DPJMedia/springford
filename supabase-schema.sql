-- =============================================
-- Spring-Ford Press Database Schema
-- =============================================
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER PROFILES TABLE
-- =============================================
-- Extends Supabase auth.users with custom profile data
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. ARTICLES TABLE
-- =============================================
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  town TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_category ON public.articles(category);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX idx_articles_author ON public.articles(author_id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- USER PROFILES POLICIES
-- Anyone can view basic user profiles
CREATE POLICY "Public can view user profiles"
  ON public.user_profiles FOR SELECT
  TO public
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Super admin can update any profile
CREATE POLICY "Super admin can update any profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ARTICLES POLICIES
-- Public can view published articles
CREATE POLICY "Public can view published articles"
  ON public.articles FOR SELECT
  TO public
  USING (status = 'published');

-- Authenticated users can view all articles
CREATE POLICY "Authenticated users can view all articles"
  ON public.articles FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert articles
CREATE POLICY "Admins can create articles"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Admins can update articles
CREATE POLICY "Admins can update articles"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Admins can delete articles
CREATE POLICY "Admins can delete articles"
  ON public.articles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- =============================================
-- 5. FUNCTIONS & TRIGGERS
-- =============================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE WHEN NEW.email = 'dylancobb2525@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger for articles updated_at
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to auto-set published_at when status changes to published
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set published_at
CREATE TRIGGER set_article_published_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_published_at();

-- =============================================
-- 6. STORAGE BUCKET FOR ARTICLE IMAGES
-- =============================================

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to view images
CREATE POLICY "Public can view article images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'article-images');

-- Allow admins to upload images
CREATE POLICY "Admins can upload article images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-images' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Allow admins to delete images
CREATE POLICY "Admins can delete article images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-images' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- =============================================
-- 7. INSERT SAMPLE DATA (Optional - for testing)
-- =============================================

-- You can uncomment this section after you create your super admin account
-- to insert some sample articles for testing

/*
INSERT INTO public.articles (title, excerpt, content, author_name, category, neighborhood, town, status, published_at)
VALUES 
  (
    'Welcome to Spring-Ford Press',
    'Your new neighborhood news source is now live.',
    'We''re excited to launch Spring-Ford Press, your source for local news and community updates...',
    'Editorial Team',
    'Community',
    'Town Center',
    'Spring Ford',
    'published',
    NOW()
  ),
  (
    'Council Meeting Scheduled',
    'Join us for the monthly town council meeting next week.',
    'The Spring Ford Town Council will meet next Tuesday at 7 PM to discuss upcoming projects...',
    'Admin',
    'Government',
    'Town Center',
    'Spring Ford',
    'published',
    NOW()
  );
*/

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- Next steps:
-- 1. Sign up for an account using dylancobb2525@gmail.com (you'll auto-become super admin)
-- 2. Test the authentication in your Next.js app
-- 3. Create some articles from the admin panel
-- =============================================

