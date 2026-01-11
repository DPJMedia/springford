-- =====================================================
-- ADMIN NOTIFICATIONS SYSTEM - CLEAN INSTALL
-- =====================================================
-- This is safe to run multiple times
-- It will update the notification function without breaking anything

-- =====================================================
-- STEP 1: Update the article notification function
-- =====================================================
-- This fixes the "created_by" field error
CREATE OR REPLACE FUNCTION notify_admins_article_change()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    action_text TEXT;
    creator_name TEXT;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Get the creator's name from the article's author_name or from user_profiles
    IF NEW.author_name IS NOT NULL THEN
        creator_name := NEW.author_name;
    ELSE
        SELECT full_name INTO creator_name
        FROM public.user_profiles
        WHERE id = current_user_id;
    END IF;
    
    IF creator_name IS NULL THEN
        creator_name := 'Someone';
    END IF;

    -- Determine action text
    IF TG_OP = 'INSERT' THEN
        action_text := 'created a new article: ' || NEW.title;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            action_text := 'changed status to ' || NEW.status || ' for: ' || NEW.title;
        ELSE
            action_text := 'edited article: ' || NEW.title;
        END IF;
    END IF;

    -- Insert notification for each admin (only if there are admins to notify)
    FOR admin_id IN SELECT user_id FROM get_admin_user_ids() LOOP
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
                'article',
                NEW.id,
                'article',
                action_text,
                current_user_id,
                creator_name
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Recreate the triggers (safe to run)
-- =====================================================
-- Drop and recreate triggers for articles
DROP TRIGGER IF EXISTS article_change_notify ON public.articles;
CREATE TRIGGER article_change_notify
AFTER INSERT OR UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION notify_admins_article_change();

-- Drop and recreate triggers for ads
DROP TRIGGER IF EXISTS ad_change_notify ON public.ads;
CREATE TRIGGER ad_change_notify
AFTER INSERT OR UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION notify_super_admins_ad_change();

-- =====================================================
-- DONE!
-- =====================================================
-- The notification system is now updated and working
-- Try editing an article - other admins should get notified!



