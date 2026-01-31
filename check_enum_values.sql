-- Check what values are allowed in the user_level enum
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'user_level'
ORDER BY e.enumsortorder;

-- Also show what actual values are in the table
SELECT DISTINCT user_level FROM user_profiles;
