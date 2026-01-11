-- Add avatar_url column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Step 1: Add avatar_url column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username) WHERE username IS NOT NULL;

-- Step 3: Add unique constraint on username (if not already exists)
-- First, check if there are any duplicate usernames
DO $$
BEGIN
  -- Check for duplicates
  IF EXISTS (
    SELECT username, COUNT(*) 
    FROM public.user_profiles 
    WHERE username IS NOT NULL 
    GROUP BY username 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Warning: Duplicate usernames found. Please resolve duplicates before adding unique constraint.';
  ELSE
    -- Add unique constraint if no duplicates
    BEGIN
      ALTER TABLE public.user_profiles 
      ADD CONSTRAINT unique_username UNIQUE (username);
      RAISE NOTICE 'Unique constraint on username added successfully!';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Unique constraint on username already exists.';
    END;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Profile avatar migration completed successfully!';
END $$;



