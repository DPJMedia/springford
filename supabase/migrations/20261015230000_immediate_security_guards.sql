-- Compatible with the currently deployed UI. Counters use their existing RPCs.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.role()='service_role' OR auth.uid() IS NULL OR EXISTS (
  SELECT 1 FROM public.user_profiles WHERE id=auth.uid() AND is_super_admin IS TRUE
 ) THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['full_name','username','avatar_url','newsletter_subscribed','newsletter_subscribed_at','updated_at'])
 IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['full_name','username','avatar_url','newsletter_subscribed','newsletter_subscribed_at','updated_at']) THEN
  RAISE EXCEPTION 'Protected profile fields cannot be changed' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_fields ON public.user_profiles;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_fields();
CREATE OR REPLACE FUNCTION public.delete_user_as_admin(user_id_to_delete uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=auth.uid() AND is_super_admin IS TRUE) THEN
  RAISE EXCEPTION 'Only super admins can delete users' USING ERRCODE='42501';
 END IF;
 DELETE FROM public.user_profiles WHERE id=user_id_to_delete;
END $$;
REVOKE ALL ON FUNCTION public.delete_user_as_admin(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_user_as_admin(uuid) TO authenticated;
DROP POLICY IF EXISTS "Enable view count updates for all" ON public.articles;
DROP POLICY IF EXISTS "Authenticated users can manage ad settings" ON public.ad_settings;
DROP POLICY IF EXISTS "Authenticated users can manage slot assignments" ON public.ad_slot_assignments;
DROP POLICY IF EXISTS "Super admins can manage ads" ON public.ads;
DROP POLICY IF EXISTS "Authenticated users can view all ads" ON public.ads;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ads','ad_settings','ad_slot_assignments'] LOOP
  EXECUTE format('CREATE POLICY "verified super admin management" ON public.%I FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.user_profiles WHERE id=auth.uid() AND is_super_admin IS TRUE)) WITH CHECK (EXISTS(SELECT 1 FROM public.user_profiles WHERE id=auth.uid() AND is_super_admin IS TRUE))',t);
 END LOOP;
END $$;
COMMIT;
