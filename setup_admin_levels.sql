-- ============================================
-- Setup Admin Levels and User Deletion
-- ============================================
-- This adds admin levels to the enum and allows deletion
-- ============================================

-- 1. Add admin and super_admin to the user_level enum
ALTER TYPE user_level ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_level ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Update YOUR account to be super_admin (dylancobb2525@gmail.com)
UPDATE user_profiles 
SET user_level = 'super_admin'
WHERE email = 'dylancobb2525@gmail.com';

-- 3. Update John McGuire to be super_admin
UPDATE user_profiles 
SET user_level = 'super_admin'
WHERE email = 'johnmcguire04@gmail.com';

-- 4. Update Preston (gmail) to be super_admin
UPDATE user_profiles 
SET user_level = 'super_admin'
WHERE email ILIKE '%prestonschlagheck@gmail.com%';

-- 5. Create function to delete users (bypasses RLS)
CREATE OR REPLACE FUNCTION delete_user_as_admin(user_id_to_delete UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_level TEXT;
BEGIN
  -- Get the current user's level
  SELECT user_level::TEXT INTO current_user_level
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only allow if user is super_admin
  IF current_user_level != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can delete users';
  END IF;
  
  -- Delete the user profile
  DELETE FROM user_profiles WHERE id = user_id_to_delete;
END;
$$;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_as_admin(UUID) TO authenticated;

-- 7. Add RLS policy to allow super_admin to delete
DROP POLICY IF EXISTS "Super admins can delete users" ON user_profiles;
CREATE POLICY "Super admins can delete users"
  ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND user_level = 'super_admin'
    )
  );

-- 8. Verify who is now super_admin
SELECT id, full_name, email, user_level FROM user_profiles WHERE user_level = 'super_admin';
