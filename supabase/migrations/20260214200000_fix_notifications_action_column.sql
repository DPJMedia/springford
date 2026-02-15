-- Fix: notifications table has NOT NULL "action" column - notify_admins must populate it

-- 1. Make action nullable (so inserts don't fail if we miss it)
ALTER TABLE notifications ALTER COLUMN action DROP NOT NULL;

-- 2. Update notify_admins to include action in insert (use type as action value)
CREATE OR REPLACE FUNCTION notify_admins(
  p_type TEXT,
  p_message TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_actor_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, message, target_type, target_id, actor_name, action)
  SELECT id, p_type, p_message, p_target_type, p_target_id, p_actor_name, p_type
  FROM user_profiles
  WHERE is_admin = true OR is_super_admin = true;
END;
$$;
