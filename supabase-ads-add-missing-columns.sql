-- Add missing columns to ads table
-- This migration adds columns that were added to the code but not in the original migration

-- Add runtime_seconds column (for ad rotation)
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS runtime_seconds INTEGER NULL;

-- Add display_order column (for rotation order)
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ads_runtime_seconds ON public.ads(runtime_seconds);
CREATE INDEX IF NOT EXISTS idx_ads_display_order ON public.ads(display_order);

-- Update existing ads to have display_order = 0 if they don't have one
UPDATE public.ads
SET display_order = 0
WHERE display_order IS NULL;

-- Create ad_slot_assignments table for multiple slot assignments
CREATE TABLE IF NOT EXISTS public.ad_slot_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  ad_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, ad_slot) -- Prevent duplicate assignments
);

-- Create indexes for ad_slot_assignments
CREATE INDEX IF NOT EXISTS idx_ad_slot_assignments_ad_id ON public.ad_slot_assignments(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_slot_assignments_slot ON public.ad_slot_assignments(ad_slot);

-- Grant permissions
GRANT SELECT ON public.ad_slot_assignments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_slot_assignments TO authenticated;

-- Enable RLS
ALTER TABLE public.ad_slot_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read slot assignments
CREATE POLICY "Anyone can view slot assignments"
  ON public.ad_slot_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Authenticated users can manage slot assignments
CREATE POLICY "Authenticated users can manage slot assignments"
  ON public.ad_slot_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Migrate existing ads to ad_slot_assignments table
-- This ensures existing ads with ad_slot are also in the assignments table
INSERT INTO public.ad_slot_assignments (ad_id, ad_slot)
SELECT id, ad_slot
FROM public.ads
WHERE ad_slot IS NOT NULL AND ad_slot != ''
ON CONFLICT (ad_id, ad_slot) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Missing columns (runtime_seconds, display_order) and ad_slot_assignments table added successfully!';
END $$;

