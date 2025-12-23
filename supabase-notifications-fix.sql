-- =====================================================
-- FIX FOR NOTIFICATION TRIGGER
-- =====================================================
-- This fixes the "created_by" field error
-- Run this in Supabase SQL Editor

-- Drop and recreate the notification function with correct field references
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

    -- Insert notification for each admin
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

