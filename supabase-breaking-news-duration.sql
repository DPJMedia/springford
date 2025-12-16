-- ADD BREAKING NEWS DURATION FIELD
-- This allows setting how long an article remains as breaking news (default 24 hours)

-- Add column for breaking news duration (in hours)
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS breaking_news_duration INTEGER DEFAULT 24;

-- Add column for when breaking news status was set
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS breaking_news_set_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN public.articles.breaking_news_duration IS 'How many hours this article remains as breaking news (default 24)';
COMMENT ON COLUMN public.articles.breaking_news_set_at IS 'When the article was marked as breaking news';

-- Update existing breaking news articles to set the timestamp
UPDATE public.articles
SET breaking_news_set_at = published_at
WHERE is_breaking = true AND breaking_news_set_at IS NULL;

-- Create function to check if breaking news is still active
CREATE OR REPLACE FUNCTION is_breaking_news_active(
  is_breaking BOOLEAN,
  breaking_news_set_at TIMESTAMPTZ,
  breaking_news_duration INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_breaking OR breaking_news_set_at IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if current time is within the breaking news duration
  RETURN NOW() < (breaking_news_set_at + (breaking_news_duration || ' hours')::INTERVAL);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_breaking_news_active(BOOLEAN, TIMESTAMPTZ, INTEGER) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Breaking news duration feature added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - breaking_news_duration: How many hours article stays as breaking news (default: 24)';
  RAISE NOTICE '  - breaking_news_set_at: Timestamp when marked as breaking news';
  RAISE NOTICE '';
  RAISE NOTICE 'New function created:';
  RAISE NOTICE '  - is_breaking_news_active(): Checks if breaking news is still active';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage: Articles marked as breaking news will automatically expire after the duration.';
END $$;

