-- Enhancement migration for ads system
-- Adds support for:
-- 1. Multiple ad slots per ad
-- 2. Runtime/duration for ad rotation
-- 3. Precise datetime scheduling (date + time)

-- Add runtime_seconds column for ad rotation
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS runtime_seconds INTEGER DEFAULT NULL;

-- Add display_order for rotation sequence
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create junction table for multiple ad slots per ad
CREATE TABLE IF NOT EXISTS public.ad_slot_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  ad_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, ad_slot)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_ad_slot_assignments_ad_id ON public.ad_slot_assignments(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_slot_assignments_slot ON public.ad_slot_assignments(ad_slot);

-- Migrate existing single ad_slot to junction table
INSERT INTO public.ad_slot_assignments (ad_id, ad_slot)
SELECT id, ad_slot
FROM public.ads
WHERE ad_slot IS NOT NULL
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.ad_slot_assignments TO authenticated;
GRANT SELECT ON public.ad_slot_assignments TO anon;

-- Enable RLS
ALTER TABLE public.ad_slot_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view slot assignments
CREATE POLICY "Anyone can view ad slot assignments"
  ON public.ad_slot_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Authenticated users can manage (handled in app layer)
CREATE POLICY "Authenticated users can manage ad slot assignments"
  ON public.ad_slot_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update function to get active ads for a slot with rotation support
CREATE OR REPLACE FUNCTION get_active_ads_for_slot(slot_name TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  image_url TEXT,
  link_url TEXT,
  runtime_seconds INTEGER,
  display_order INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.image_url,
    a.link_url,
    a.runtime_seconds,
    a.display_order,
    a.start_date,
    a.end_date
  FROM public.ads a
  INNER JOIN public.ad_slot_assignments asa ON a.id = asa.ad_id
  WHERE asa.ad_slot = slot_name
    AND a.is_active = true
    AND a.start_date <= NOW()
    AND a.end_date >= NOW()
  ORDER BY a.display_order ASC, a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We keep the ad_slot column for backwards compatibility but will use ad_slot_assignments going forward
-- The ad_slot column can be removed in a future migration if desired

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Ads enhancement migration completed successfully!';
END $$;



