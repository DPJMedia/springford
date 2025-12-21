-- Add newsletter_subscribed column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Step 1: Add newsletter_subscribed column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_newsletter ON public.user_profiles(newsletter_subscribed) WHERE newsletter_subscribed = true;

-- Step 3: Update the handle_new_user function to accept newsletter preference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, is_super_admin, newsletter_subscribed)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE WHEN NEW.email = 'dylancobb2525@gmail.com' THEN true ELSE false END,
    COALESCE((NEW.raw_user_meta_data->>'newsletter_subscribed')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Newsletter subscription column added successfully!';
END $$;

