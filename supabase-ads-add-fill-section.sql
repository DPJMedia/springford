-- Migration: Add fill_section column to ad_slot_assignments table
-- This allows users to choose whether ads should fill their section (object-cover)
-- or maintain their true size (object-contain) on a PER-SLOT basis
-- Run this in your Supabase SQL Editor

-- Add fill_section column to ad_slot_assignments (default true for backwards compatibility)
ALTER TABLE ad_slot_assignments
ADD COLUMN IF NOT EXISTS fill_section BOOLEAN DEFAULT true NOT NULL;

-- Update existing assignments to use fill_section = true (default behavior)
UPDATE ad_slot_assignments
SET fill_section = true
WHERE fill_section IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added fill_section column to ad_slot_assignments table!';
  RAISE NOTICE 'fill_section = true: Image fills entire section (object-cover) - DEFAULT';
  RAISE NOTICE 'fill_section = false: Image maintains true size (object-contain)';
  RAISE NOTICE 'This setting is now per-slot, so the same ad can fill one slot and not another!';
END $$;

