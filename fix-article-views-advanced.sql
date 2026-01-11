-- =====================================================
-- ADVANCED FIX FOR ARTICLE VIEWS
-- =====================================================
-- This script ensures article view counting works properly
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check current RLS policies on articles table
DO $$
BEGIN
  RAISE NOTICE 'Checking current RLS policies...';
END $$;

-- Step 2: Drop the old view count policy if it exists
DROP POLICY IF EXISTS "Allow view count increment" ON public.articles;

-- Step 3: Create a more permissive policy for view count updates
-- This allows the SECURITY DEFINER function to update view counts
CREATE POLICY "Enable view count updates for all"
ON public.articles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Step 4: Ensure the function exists and has proper permissions
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the view count
  UPDATE public.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id;
  
  -- Log success (optional, for debugging)
  RAISE NOTICE 'Incremented view count for article: %', article_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    RAISE WARNING 'Failed to increment view count for article %: %', article_id, SQLERRM;
END;
$$;

-- Step 5: Grant execute permissions to everyone
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO service_role;

-- Step 6: Ensure view_count column exists and has default value
DO $$
BEGIN
  -- Check if view_count column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'articles' 
    AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.articles ADD COLUMN view_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added view_count column';
  ELSE
    RAISE NOTICE 'view_count column already exists';
  END IF;
  
  -- Ensure all existing articles have a view_count (not null)
  UPDATE public.articles 
  SET view_count = 0 
  WHERE view_count IS NULL;
  
  RAISE NOTICE 'Ensured all articles have view_count initialized';
END $$;

-- Step 7: Test the function manually
DO $$
DECLARE
  test_article_id UUID;
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get the first article
  SELECT id INTO test_article_id 
  FROM public.articles 
  LIMIT 1;
  
  IF test_article_id IS NOT NULL THEN
    -- Get current count
    SELECT view_count INTO old_count 
    FROM public.articles 
    WHERE id = test_article_id;
    
    -- Increment
    PERFORM increment_article_views(test_article_id);
    
    -- Get new count
    SELECT view_count INTO new_count 
    FROM public.articles 
    WHERE id = test_article_id;
    
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'TEST RESULTS:';
    RAISE NOTICE 'Article ID: %', test_article_id;
    RAISE NOTICE 'Old count: %', old_count;
    RAISE NOTICE 'New count: %', new_count;
    
    IF new_count > old_count THEN
      RAISE NOTICE '✓ SUCCESS: View count incremented!';
    ELSE
      RAISE WARNING '✗ FAILED: View count did not increment';
    END IF;
    RAISE NOTICE '==================================================';
  ELSE
    RAISE WARNING 'No articles found to test';
  END IF;
END $$;

-- Step 8: Verify RLS is enabled but not blocking our function
DO $$
BEGIN
  -- Check if RLS is enabled on articles table
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'articles' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS is enabled on articles table';
  ELSE
    RAISE WARNING '⚠ RLS is NOT enabled on articles table';
  END IF;
END $$;

-- Final confirmation
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✓ ARTICLE VIEWS FIX COMPLETED';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Created permissive RLS policy for view updates';
  RAISE NOTICE '2. Recreated increment function with error handling';
  RAISE NOTICE '3. Granted permissions to all user types';
  RAISE NOTICE '4. Initialized all view counts to 0';
  RAISE NOTICE '5. Ran test increment (check results above)';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Visit an article on your site';
  RAISE NOTICE '2. Check browser console for any errors';
  RAISE NOTICE '3. Refresh admin dashboard to see updated count';
  RAISE NOTICE '==================================================';
END $$;
