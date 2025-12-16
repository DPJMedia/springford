-- AUTO-PUBLISH SCHEDULED ARTICLES
-- This function automatically publishes articles whose scheduled time has arrived

-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS auto_publish_scheduled_articles();

-- Create function to publish scheduled articles
CREATE OR REPLACE FUNCTION auto_publish_scheduled_articles()
RETURNS TABLE(published_count INTEGER) AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all scheduled articles whose time has arrived
  UPDATE public.articles
  SET 
    status = 'published',
    published_at = scheduled_for,
    updated_at = NOW()
  WHERE 
    status = 'scheduled'
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= NOW();
  
  -- Get count of updated articles
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Return the count
  RETURN QUERY SELECT updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_publish_scheduled_articles() TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION auto_publish_scheduled_articles() IS 'Automatically publishes scheduled articles whose scheduled time has arrived. Returns count of articles published.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-publish function created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'The function "auto_publish_scheduled_articles()" will:';
  RAISE NOTICE '  - Find all scheduled articles where scheduled_for <= NOW()';
  RAISE NOTICE '  - Change their status from "scheduled" to "published"';
  RAISE NOTICE '  - Set published_at to their scheduled_for time';
  RAISE NOTICE '';
  RAISE NOTICE 'This function is called automatically when you visit the article manager.';
  RAISE NOTICE 'Articles will publish within seconds of their scheduled time!';
END $$;

