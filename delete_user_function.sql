-- ============================================
-- Function to allow Super Admins to delete users
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Create function to delete users (bypasses RLS)
CREATE OR REPLACE FUNCTION delete_user_as_admin(user_id_to_delete UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  -- Delete the user profile
  DELETE FROM user_profiles WHERE id = user_id_to_delete;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_as_admin(UUID) TO authenticated;

-- Update RLS policy to allow super admins to delete
DROP POLICY IF EXISTS "Super admins can delete users" ON user_profiles;
CREATE POLICY "Super admins can delete users"
  ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );
