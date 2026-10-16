-- Phase A: additive compatibility objects. Apply BEFORE deploying the application.
BEGIN;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION app_private.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_super_admin = true);
$$;
CREATE OR REPLACE FUNCTION app_private.can_manage_tenant(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT app_private.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.tenant_memberships WHERE user_id = auth.uid() AND tenant_id = p_tenant AND role IN ('admin', 'editor'));
$$;
REVOKE ALL ON FUNCTION app_private.is_super_admin(), app_private.can_manage_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_super_admin(), app_private.can_manage_tenant(uuid) TO anon, authenticated, service_role;
-- Views run as their owner deliberately: only teaser fields pass the boundary.
CREATE OR REPLACE VIEW public.article_previews WITH (security_barrier = true) AS
SELECT id, tenant_id, title, slug, subtitle, excerpt, image_url, published_at, author_name,
  primary_author_id, co_author_id, sections, section, category, tags, is_advertisement,
  sponsor_url, ai_assisted, is_breaking, visibility, is_featured, breaking_news_set_at,
  breaking_news_duration, share_count, view_count, created_at, updated_at, status,
  meta_title, meta_description, canonical_url
FROM public.articles
WHERE status = 'published' AND published_at <= now()
  AND (COALESCE(visibility, 'public') IN ('public','newsletter_subscribers')
    OR (auth.uid() IS NOT NULL AND app_private.can_manage_tenant(tenant_id)));
GRANT SELECT ON public.article_previews TO anon, authenticated, service_role;
-- Boolean lookup preserves signup validation without opening the private table.
CREATE OR REPLACE FUNCTION public.is_username_available(candidate text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT length(trim(candidate)) BETWEEN 3 AND 100 AND trim(candidate) ~ '^[a-zA-Z0-9_]+$'
 AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE lower(username) = lower(trim(candidate)) AND id IS DISTINCT FROM auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
CREATE TABLE IF NOT EXISTS public.request_rate_limits (
 key text PRIMARY KEY, window_started_at timestamptz NOT NULL, hits integer NOT NULL
);
ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_rate_limits FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.take_rate_limit(p_key text, p_limit integer, p_window_seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer;
BEGIN
 IF p_limit < 1 OR p_window_seconds < 1 OR length(p_key) > 256 THEN RETURN false; END IF;
 INSERT INTO public.request_rate_limits AS limits VALUES (p_key, now(), 1)
 ON CONFLICT (key) DO UPDATE SET
   window_started_at = CASE WHEN limits.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN now() ELSE limits.window_started_at END,
   hits = CASE WHEN limits.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN 1 ELSE limits.hits + 1 END
 RETURNING hits INTO n;
 RETURN n <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.take_rate_limit(text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.take_rate_limit(text,integer,integer) TO service_role;
CREATE TABLE IF NOT EXISTS public.newsletter_send_batches (
 campaign_id uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
 batch_index integer NOT NULL, recipients jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','uncertain')),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(campaign_id, batch_index)
);
ALTER TABLE public.newsletter_send_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_send_batches FROM anon, authenticated;
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
 event_id text PRIMARY KEY, event_type text NOT NULL, processed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;
CREATE TABLE IF NOT EXISTS public.support_subscriptions (
 subscription_id text PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 profile jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support owner read" ON public.support_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR app_private.is_super_admin());
GRANT SELECT ON public.support_subscriptions TO authenticated;
GRANT ALL ON public.request_rate_limits, public.newsletter_send_batches, public.stripe_webhook_events, public.support_subscriptions TO service_role;
CREATE OR REPLACE FUNCTION public.set_newsletter_subscription_for_user(p_user uuid,p_tenant uuid,p_subscribed boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE was_subscribed boolean;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=p_tenant AND is_active=true) THEN RAISE EXCEPTION 'Publication not found'; END IF;
 INSERT INTO public.tenant_newsletter_subscriptions(user_id,tenant_id,subscribed)VALUES(p_user,p_tenant,false)ON CONFLICT(user_id,tenant_id)DO NOTHING;
 SELECT subscribed INTO was_subscribed FROM public.tenant_newsletter_subscriptions WHERE user_id=p_user AND tenant_id=p_tenant FOR UPDATE;
 IF COALESCE(was_subscribed,false) IS DISTINCT FROM p_subscribed THEN
  UPDATE public.tenant_newsletter_subscriptions SET subscribed=p_subscribed,subscribed_at=CASE WHEN p_subscribed THEN now() ELSE subscribed_at END,unsubscribed_at=CASE WHEN p_subscribed THEN NULL ELSE now() END WHERE user_id=p_user AND tenant_id=p_tenant;
 END IF;
 UPDATE public.user_profiles SET newsletter_subscribed=EXISTS(SELECT 1 FROM public.tenant_newsletter_subscriptions WHERE user_id=p_user AND subscribed=true),
 newsletter_subscribed_at=(SELECT min(subscribed_at)FROM public.tenant_newsletter_subscriptions WHERE user_id=p_user AND subscribed=true) WHERE id=p_user;
 RETURN COALESCE(was_subscribed,false) IS DISTINCT FROM p_subscribed;
END $$;
REVOKE ALL ON FUNCTION public.set_newsletter_subscription_for_user(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_newsletter_subscription_for_user(uuid,uuid,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.set_newsletter_subscription(p_tenant uuid,p_subscribed boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 RETURN public.set_newsletter_subscription_for_user(auth.uid(),p_tenant,p_subscribed);
END $$;
REVOKE ALL ON FUNCTION public.set_newsletter_subscription(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_newsletter_subscription(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(p_id text,p_type text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claimed text;
BEGIN
 INSERT INTO public.stripe_webhook_events AS events(event_id,event_type)VALUES(p_id,p_type)
 ON CONFLICT(event_id)DO UPDATE SET created_at=now()
 WHERE events.processed_at IS NULL AND events.created_at<now()-interval '3 minutes'
 RETURNING event_id INTO claimed;
 RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_newsletter_suppression(p_user uuid,p_tenant uuid,p_occurred timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.tenant_newsletter_subscriptions SET subscribed=false,unsubscribed_at=p_occurred
 WHERE user_id=p_user AND (p_tenant IS NULL OR tenant_id=p_tenant) AND (subscribed_at IS NULL OR subscribed_at<=p_occurred);
 UPDATE public.user_profiles SET newsletter_subscribed=EXISTS(SELECT 1 FROM public.tenant_newsletter_subscriptions WHERE user_id=p_user AND subscribed=true),newsletter_subscribed_at=(SELECT min(subscribed_at)FROM public.tenant_newsletter_subscriptions WHERE user_id=p_user AND subscribed=true)WHERE id=p_user;
END $$;
REVOKE ALL ON FUNCTION public.apply_newsletter_suppression(uuid,uuid,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_newsletter_suppression(uuid,uuid,timestamptz) TO service_role;
COMMIT;
