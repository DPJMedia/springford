-- =============================================
-- Migration: Add Account Number to User Profiles
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- Function to generate random 7-character alphanumeric account number
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add account_number column to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN account_number TEXT UNIQUE;
  END IF;
END $$;

-- Create index for account_number
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_number ON public.user_profiles(account_number);

-- Update the handle_new_user function to include username and account_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_account_number TEXT;
  generated_username TEXT;
BEGIN
  -- Generate unique account number
  LOOP
    new_account_number := generate_account_number();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE account_number = new_account_number
    );
  END LOOP;

  -- Get username from metadata, or generate from email if not provided
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Insert user profile with account number
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    username,
    account_number,
    is_super_admin
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    generated_username,
    new_account_number,
    CASE WHEN NEW.email = 'dylancobb2525@gmail.com' THEN true ELSE false END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users without account numbers
UPDATE public.user_profiles 
SET account_number = generate_account_number()
WHERE account_number IS NULL;

-- =============================================
-- Migration Complete!
-- =============================================
-- All users now have unique 7-character account numbers
-- New users will automatically get an account number
-- =============================================

