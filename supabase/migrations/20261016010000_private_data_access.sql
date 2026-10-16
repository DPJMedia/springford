-- Phase B: apply ONLY AFTER the new app passes the deployment smoke checks.
-- Replaces permissive policies; adding more policies alone does not restrict access.
-- No customer rows or analytics history are removed.
BEGIN;
DO $$
DECLARE p record; t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['user_profiles','tenant_memberships','tenant_newsletter_subscriptions',
 'page_views','ad_impressions','ad_clicks','author_clicks','section_clicks','article_scroll_data',
 'articles','newsletter_campaigns','newsletter_templates','editors_picks','calendar_events'] LOOP
  IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
  END LOOP;
 END LOOP;
END $$;
CREATE POLICY "profile private read" ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid() OR app_private.is_super_admin());
CREATE POLICY "profile private update" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR app_private.is_super_admin()) WITH CHECK (id = auth.uid() OR app_private.is_super_admin());
CREATE POLICY "profile admin delete" ON public.user_profiles FOR DELETE TO authenticated USING (app_private.is_super_admin());
CREATE OR REPLACE FUNCTION app_private.guard_profile_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.role() = 'service_role' OR auth.uid() IS NULL OR app_private.is_super_admin() THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW) - ARRAY['full_name','username','avatar_url','newsletter_subscribed','newsletter_subscribed_at','updated_at'])
 IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name','username','avatar_url','newsletter_subscribed','newsletter_subscribed_at','updated_at']) THEN
  RAISE EXCEPTION 'Protected profile fields cannot be changed' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_fields ON public.user_profiles;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION app_private.guard_profile_fields();
CREATE POLICY "memberships own or staff read" ON public.tenant_memberships FOR SELECT TO authenticated USING (user_id = auth.uid() OR app_private.can_manage_tenant(tenant_id));
CREATE POLICY "memberships super admin write" ON public.tenant_memberships FOR ALL TO authenticated USING (app_private.is_super_admin()) WITH CHECK (app_private.is_super_admin());
CREATE POLICY "subscriptions owner or staff read" ON public.tenant_newsletter_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR app_private.can_manage_tenant(tenant_id));
CREATE POLICY "subscriptions owner write" ON public.tenant_newsletter_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid() OR app_private.is_super_admin()) WITH CHECK (user_id = auth.uid() OR app_private.is_super_admin());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['page_views','ad_impressions','ad_clicks','author_clicks','section_clicks','article_scroll_data'] LOOP
  EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  EXECUTE format('CREATE POLICY "analytics tenant staff read" ON public.%I FOR SELECT TO authenticated USING (app_private.can_manage_tenant(tenant_id))',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['newsletter_templates','editors_picks','calendar_events'] LOOP
  EXECUTE format('CREATE POLICY "tenant staff access" ON public.%I FOR ALL TO authenticated USING (app_private.can_manage_tenant(tenant_id)) WITH CHECK (app_private.can_manage_tenant(tenant_id))',t);
 END LOOP;
END $$;
CREATE POLICY "campaign tenant staff access" ON public.newsletter_campaigns FOR ALL TO authenticated USING (app_private.can_manage_tenant(tenant_id)) WITH CHECK (app_private.can_manage_tenant(tenant_id) AND (app_private.is_super_admin() OR COALESCE(recipients_type,'newsletter') IN ('newsletter','tenant_staff')));
CREATE POLICY "public picks" ON public.editors_picks FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "public calendar" ON public.calendar_events FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "article public body" ON public.articles FOR SELECT TO anon,authenticated USING (
 status='published' AND published_at <= now() AND COALESCE(visibility,'public')='public');
CREATE POLICY "article subscribed body" ON public.articles FOR SELECT TO authenticated USING (
 status='published' AND published_at <= now() AND visibility='newsletter_subscribers' AND EXISTS (
 SELECT 1 FROM public.tenant_newsletter_subscriptions s WHERE s.user_id=auth.uid() AND s.tenant_id=articles.tenant_id AND s.subscribed=true));
CREATE POLICY "article tenant staff" ON public.articles FOR ALL TO authenticated USING (app_private.can_manage_tenant(tenant_id)) WITH CHECK (app_private.can_manage_tenant(tenant_id));
-- Public RPC exposes metadata only, and private bodies never influence anonymous search.
DROP FUNCTION IF EXISTS public.search_articles(text);
CREATE FUNCTION public.search_articles(search_query text, p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (id uuid,title text,slug text,excerpt text,image_url text,author_name text,published_at timestamptz,category text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT a.id,a.title,a.slug,a.excerpt,a.image_url,a.author_name,a.published_at,a.category
 FROM public.article_previews a LEFT JOIN public.articles body ON body.id=a.id
 WHERE (p_tenant_id IS NULL OR a.tenant_id=p_tenant_id) AND length(trim(search_query))>=2
 AND to_tsvector('english',concat_ws(' ',a.title,a.excerpt,a.meta_title,a.meta_description,a.category,a.subtitle,body.content)) @@ plainto_tsquery('english',search_query)
 ORDER BY a.published_at DESC LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.search_articles(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_articles(text,uuid) TO anon,authenticated,service_role;
-- Administrative aggregation and scheduling are invoked only by authenticated server routes.
REVOKE ALL ON FUNCTION public.get_admin_analytics_dashboard(timestamptz,timestamptz,timestamptz,timestamptz,text,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_dashboard(timestamptz,timestamptz,timestamptz,timestamptz,text,integer,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_admin_user_ids(),public.get_super_admin_user_ids(),public.auto_publish_scheduled_articles() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids(),public.get_super_admin_user_ids(),public.auto_publish_scheduled_articles() TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
