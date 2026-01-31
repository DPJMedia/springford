-- ============================================
-- Fix Preston User Permissions
-- ============================================
-- This removes admin rights from the regular user Preston
-- and ensures the correct Preston has admin rights
-- ============================================

-- First, let's see what we have
SELECT id, email, full_name, is_admin, is_super_admin 
FROM user_profiles 
WHERE full_name ILIKE '%preston%' OR email ILIKE '%preston%';

-- Remove admin from the student email Preston
UPDATE user_profiles 
SET is_admin = false, is_super_admin = false
WHERE email ILIKE '%schlaghp@email.sc.edu%';

-- Make sure the gmail Preston has super admin
UPDATE user_profiles 
SET is_super_admin = true, is_admin = true
WHERE email ILIKE '%prestonschlagheck@gmail.com%';

-- Verify the changes
SELECT id, email, full_name, is_admin, is_super_admin 
FROM user_profiles 
WHERE full_name ILIKE '%preston%' OR email ILIKE '%preston%';
