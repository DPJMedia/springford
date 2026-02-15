-- Add is_advertisement flag to articles (sponsored/advertisement content)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_advertisement BOOLEAN DEFAULT false;
