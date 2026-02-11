-- Add optional "Advertisement" label text color per ad (hex, e.g. #ffffff)
-- Run in Supabase SQL Editor.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS ad_label_color TEXT;
