-- Add display_order column to ads table if it doesn't exist
-- This column is used for rotation order when multiple ads share the same slot

ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;

-- Create an index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_ads_display_order ON public.ads(display_order);

-- Update existing ads to have display_order = 0 if they don't have one
UPDATE public.ads
SET display_order = 0
WHERE display_order IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'display_order column added to ads table successfully!';
END $$;



