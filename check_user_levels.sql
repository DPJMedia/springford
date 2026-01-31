-- Check what user_level values exist
SELECT DISTINCT user_level FROM user_profiles;

-- Show all users with their levels
SELECT id, full_name, user_level FROM user_profiles ORDER BY user_level;
