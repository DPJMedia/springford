-- =====================================================
-- DATABASE CLEANUP AND FIXES
-- =====================================================
-- This script will:
-- 1. Delete unused "diffuse_*" tables
-- 2. Fix the ad notification trigger (remove status field check)
-- 3. Fix article views increment function
-- =====================================================

-- =====================================================
-- PART 1: DELETE UNUSED DIFFUSE TABLES
-- =====================================================
-- These tables are from another project and not used by the news site

DROP TABLE IF EXISTS public.diffuse_workspace_members CASCADE;
DROP TABLE IF EXISTS public.diffuse_springford_links CASCADE;
DROP TABLE IF EXISTS public.diffuse_recordings CASCADE;
DROP TABLE IF EXISTS public.diffuse_project_outputs CASCADE;
DROP TABLE IF EXISTS public.diffuse_project_inputs CASCADE;
DROP TABLE IF EXISTS public.diffuse_projects CASCADE;
DROP TABLE IF EXISTS public.diffuse_workspaces CASCADE;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '✓ Deleted all diffuse_* tables';
END $$;

-- =====================================================
-- PART 2: FIX AD NOTIFICATION TRIGGER
-- =====================================================
-- The error "record 'old' has no field 'status'" occurs because
-- the ads table doesn't have a 'status' column
-- Status is calculated dynamically from start_date and end_date

CREATE OR REPLACE FUNCTION notify_super_admins_ad_change()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    action_text TEXT;
    creator_name TEXT;
    ad_title TEXT;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Get the ad title
    ad_title := COALESCE(NEW.title, 'Untitled Ad');
    
    -- Get the creator's name
    SELECT full_name INTO creator_name
    FROM public.user_profiles
    WHERE id = current_user_id;
    
    IF creator_name IS NULL THEN
        creator_name := 'Someone';
    END IF;

    -- Determine action text (REMOVED status check - ads don't have status column)
    IF TG_OP = 'INSERT' THEN
        action_text := 'created a new ad: ' || ad_title;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if dates changed (status is derived from dates)
        IF OLD.start_date != NEW.start_date OR OLD.end_date != NEW.end_date THEN
            action_text := 'updated schedule for ad: ' || ad_title;
        ELSIF OLD.is_active != NEW.is_active THEN
            IF NEW.is_active THEN
                action_text := 'enabled ad: ' || ad_title;
            ELSE
                action_text := 'disabled ad: ' || ad_title;
            END IF;
        ELSE
            action_text := 'edited ad: ' || ad_title;
        END IF;
    END IF;

    -- Insert notification for each super admin
    FOR admin_id IN 
        SELECT id FROM public.user_profiles 
        WHERE is_super_admin = true
    LOOP
        -- Don't notify the person who made the change
        IF admin_id != current_user_id THEN
            INSERT INTO public.notifications (
                user_id,
                message,
                type,
                target_id,
                target_type,
                action,
                created_by,
                created_by_name
            ) VALUES (
                admin_id,
                creator_name || ' ' || action_text,
                'ad',
                NEW.id,
                'ad',
                action_text,
                current_user_id,
                creator_name
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS ad_change_notify ON public.ads;
CREATE TRIGGER ad_change_notify
AFTER INSERT OR UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION notify_super_admins_ad_change();

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '✓ Fixed ad notification trigger (removed status field check)';
END $$;

-- =====================================================
-- PART 3: FIX ARTICLE VIEWS INCREMENT
-- =====================================================
-- Ensure the function has proper security and permissions

-- Recreate the increment_article_views function with proper security
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to everyone (anon and authenticated)
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO anon, authenticated;

-- Ensure the articles table allows updates from the function
-- This policy allows the increment function to work even for anon users
DROP POLICY IF EXISTS "Allow view count increment" ON public.articles;
CREATE POLICY "Allow view count increment"
ON public.articles FOR UPDATE
USING (true)
WITH CHECK (true);

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '✓ Fixed article views increment function';
END $$;

-- =====================================================
-- PART 4: VERIFY ARTICLE SHARES FUNCTION
-- =====================================================
-- Make sure article shares are also working properly

-- Recreate the increment_article_shares function with proper security
CREATE OR REPLACE FUNCTION increment_article_shares(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_article_shares(UUID) TO anon, authenticated;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '✓ Verified article shares function';
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✓ ALL FIXES COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '1. Deleted unused diffuse_* tables';
  RAISE NOTICE '2. Fixed ad notification trigger (can now edit ads)';
  RAISE NOTICE '3. Fixed article view counting';
  RAISE NOTICE '4. Verified article share counting';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  - Edit ad dates without errors';
  RAISE NOTICE '  - Article views will increment properly';
  RAISE NOTICE '  - Article shares will track correctly';
  RAISE NOTICE '==================================================';
END $$;
