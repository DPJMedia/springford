-- =====================================================
-- ADMIN NOTIFICATIONS SYSTEM
-- =====================================================
-- This migration creates a notification system for admins
-- to be alerted of article and ad changes

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('article', 'ad')),
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('article', 'ad')),
    action TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own notifications
CREATE POLICY "Users can read their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: System can insert notifications (for triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Function to get all admin/super admin user IDs
CREATE OR REPLACE FUNCTION get_admin_user_ids()
RETURNS TABLE(user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.user_profiles
    WHERE is_admin = TRUE OR is_super_admin = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get only super admin user IDs
CREATE OR REPLACE FUNCTION get_super_admin_user_ids()
RETURNS TABLE(user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.user_profiles
    WHERE is_super_admin = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notifications for all admins
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

-- Function to notify super admins about ad changes
CREATE OR REPLACE FUNCTION notify_super_admins_ad_change()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    action_text TEXT;
    creator_name TEXT;
    ad_title TEXT;
BEGIN
    -- Get the ad title
    ad_title := COALESCE(NEW.title, 'Untitled Ad');
    
    -- Get the creator's name
    SELECT full_name INTO creator_name
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    IF creator_name IS NULL THEN
        creator_name := 'Someone';
    END IF;

    -- Determine action text
    IF TG_OP = 'INSERT' THEN
        action_text := 'created a new ad: ' || ad_title;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            action_text := 'changed ad status to ' || NEW.status || ' for: ' || ad_title;
        ELSE
            action_text := 'edited ad: ' || ad_title;
        END IF;
    END IF;

    -- Insert notification for each super admin
    FOR admin_id IN SELECT user_id FROM get_super_admin_user_ids() LOOP
        -- Don't notify the person who made the change
        IF admin_id != auth.uid() THEN
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
                auth.uid(),
                creator_name
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for articles
DROP TRIGGER IF EXISTS article_change_notify ON public.articles;
CREATE TRIGGER article_change_notify
AFTER INSERT OR UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION notify_admins_article_change();

-- Create triggers for ads
DROP TRIGGER IF EXISTS ad_change_notify ON public.ads;
CREATE TRIGGER ad_change_notify
AFTER INSERT OR UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION notify_super_admins_ad_change();

-- Grant necessary permissions
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;
GRANT DELETE ON public.notifications TO authenticated;

