-- Add ad_label_position to ads table for "Advertisement" tag position (bottom-right, bottom-left, top-right, top-left)
ALTER TABLE ads
ADD COLUMN IF NOT EXISTS ad_label_position TEXT DEFAULT 'bottom-right'
CHECK (ad_label_position IS NULL OR ad_label_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left'));

COMMENT ON COLUMN ads.ad_label_position IS 'Position of the Advertisement label on the ad; default bottom-right';
