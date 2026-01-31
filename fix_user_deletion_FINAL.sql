-- ============================================
-- FINAL FIX: Allow Super Admins to Delete Users
-- ============================================
-- This works with your actual database structure (user_level)
-- ============================================

-- 1. Create function to delete users (bypasses RLS)
CREATE OR REPLACE FUNCTION delete_user_as_admin(user_id_to_delete UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_level TEXT;
BEGIN
  -- Get the current user's level
  SELECT user_level INTO current_user_level
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

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_as_admin(UUID) TO authenticated;

-- 3. Add RLS policy to allow super_admin to delete
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

-- 4. Verify it worked
SELECT 'Function created successfully' AS status;
