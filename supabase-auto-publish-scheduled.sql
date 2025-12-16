-- AUTO-PUBLISH SCHEDULED ARTICLES
-- This function automatically publishes articles that are scheduled for the past

-- Step 1: Create function to auto-publish scheduled articles
CREATE OR REPLACE FUNCTION auto_publish_scheduled_articles()
RETURNS INTEGER AS $$
DECLARE
  published_count INTEGER;
BEGIN
  -- Update articles that are scheduled and whose scheduled_for time has passed
  UPDATE public.articles
  SET 
    status = 'published',
    published_at = scheduled_for,
    updated_at = NOW()
  WHERE 
    status = 'scheduled'
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= NOW()
  RETURNING COUNT(*) INTO published_count;

  RETURN published_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION auto_publish_scheduled_articles() TO anon, authenticated;

-- Step 3: Create a cron job to run this every minute (using pg_cron extension)
-- NOTE: pg_cron must be enabled in your Supabase project
-- Go to Database > Extensions and enable pg_cron

-- First, check if pg_cron is available (run manually)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every minute
-- Uncomment the line below after enabling pg_cron:
-- SELECT cron.schedule('auto-publish-scheduled', '* * * * *', 'SELECT auto_publish_scheduled_articles();');

-- Step 4: Alternative - Manual trigger approach
-- If pg_cron is not available, you can call this function via an API route

-- Step 5: Create a webhook-friendly function
CREATE OR REPLACE FUNCTION publish_due_articles()
RETURNS json AS $$
DECLARE
  result json;
  published_count INTEGER;
BEGIN
  -- Publish due articles
  SELECT auto_publish_scheduled_articles() INTO published_count;
  
  -- Return result as JSON
  SELECT json_build_object(
    'success', true,
    'published_count', published_count,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION publish_due_articles() TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-publish functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 IMPORTANT SETUP STEPS:';
  RAISE NOTICE '1. Enable pg_cron extension: Database > Extensions > pg_cron';
  RAISE NOTICE '2. Run: SELECT cron.schedule(''auto-publish'', ''* * * * *'', ''SELECT auto_publish_scheduled_articles();'');';
  RAISE NOTICE '3. OR create API route to call publish_due_articles() every minute';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Manual test: SELECT auto_publish_scheduled_articles();';
END $$;

