-- Check the ACTUAL structure of the Springford database
-- Run this to see what columns exist

-- 1. Show all columns in user_profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Show a sample user
SELECT * FROM user_profiles LIMIT 1;

-- 3. Show all tables in this database
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
