-- Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  ad_slot TEXT NOT NULL, -- e.g., 'homepage-sidebar', 'article-sidebar', 'homepage-banner'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Create index on ad_slot and dates for efficient queries
CREATE INDEX IF NOT EXISTS idx_ads_slot ON public.ads(ad_slot);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON public.ads(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_active ON public.ads(is_active);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_ads_updated_at_trigger ON public.ads;
CREATE TRIGGER update_ads_updated_at_trigger
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION update_ads_updated_at();

-- Create function to get active ads for a slot
CREATE OR REPLACE FUNCTION get_active_ad_for_slot(slot_name TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  image_url TEXT,
  link_url TEXT,
  ad_slot TEXT,
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
    a.ad_slot,
    a.start_date,
    a.end_date
  FROM public.ads a
  WHERE a.ad_slot = slot_name
    AND a.is_active = true
    AND a.start_date <= NOW()
    AND a.end_date >= NOW()
  ORDER BY a.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.ads TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ads TO authenticated;

-- Create RLS policies
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active ads
CREATE POLICY "Anyone can view active ads"
  ON public.ads
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND start_date <= NOW() AND end_date >= NOW());

-- Policy: Only authenticated users can view all ads (for admin)
CREATE POLICY "Authenticated users can view all ads"
  ON public.ads
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only super admins can insert/update/delete
-- Note: This requires checking user_profiles.is_super_admin
-- We'll handle this in the application layer for now
CREATE POLICY "Super admins can manage ads"
  ON public.ads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create ad_settings table for fallback configuration
CREATE TABLE IF NOT EXISTS public.ad_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_slot TEXT NOT NULL UNIQUE,
  use_fallback BOOLEAN DEFAULT true,
  fallback_ad_code TEXT, -- For Diffuse.AI or other fallback ads
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.user_profiles(id)
);

-- Grant permissions on ad_settings
GRANT SELECT ON public.ad_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_settings TO authenticated;

-- Enable RLS on ad_settings
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read ad settings
CREATE POLICY "Anyone can view ad settings"
  ON public.ad_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Only authenticated users can modify (handled in app layer)
CREATE POLICY "Authenticated users can manage ad settings"
  ON public.ad_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default ad slots with fallback enabled
INSERT INTO public.ad_settings (ad_slot, use_fallback, fallback_ad_code)
VALUES 
  ('homepage-sidebar', true, 'diffuse-ai'),
  ('article-sidebar', true, 'diffuse-ai'),
  ('homepage-banner', true, 'diffuse-ai'),
  ('article-inline', true, 'diffuse-ai')
ON CONFLICT (ad_slot) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Ads system migration completed successfully!';
END $$;



