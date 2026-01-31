-- ============================================
-- Check Database Structure
-- ============================================
-- Run this in Supabase SQL Editor to see what we have
-- ============================================

-- 1. Show all columns in user_profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Show a sample of the user_profiles data
SELECT * FROM user_profiles LIMIT 5;

-- 3. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 4. Show all policies on user_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
