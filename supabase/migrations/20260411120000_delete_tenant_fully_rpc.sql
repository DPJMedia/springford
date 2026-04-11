-- Hard-delete a tenant and all rows that reference it (FKs to tenants are NO ACTION except memberships/subs).
-- Spring-Ford Press (slug spring-ford) is rejected inside the function.

CREATE OR REPLACE FUNCTION public.delete_tenant_fully(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND slug = 'spring-ford') THEN
    RAISE EXCEPTION 'Cannot delete the Spring-Ford Press tenant';
  END IF;

  DELETE FROM public.newsletter_email_events WHERE tenant_id = p_tenant_id;
  DELETE FROM public.newsletter_campaigns WHERE tenant_id = p_tenant_id;
  DELETE FROM public.newsletter_templates WHERE tenant_id = p_tenant_id;
  DELETE FROM public.notifications WHERE tenant_id = p_tenant_id;
  DELETE FROM public.article_scroll_data WHERE tenant_id = p_tenant_id;
  DELETE FROM public.page_views WHERE tenant_id = p_tenant_id;
  DELETE FROM public.ad_clicks WHERE tenant_id = p_tenant_id;
  DELETE FROM public.ad_impressions WHERE tenant_id = p_tenant_id;
  DELETE FROM public.ad_slot_assignments WHERE tenant_id = p_tenant_id;
  DELETE FROM public.ads WHERE tenant_id = p_tenant_id;
  DELETE FROM public.ad_settings WHERE tenant_id = p_tenant_id;
  DELETE FROM public.editors_picks WHERE tenant_id = p_tenant_id;
  DELETE FROM public.diffuse_imported_articles WHERE tenant_id = p_tenant_id;
  DELETE FROM public.diffuse_connections WHERE tenant_id = p_tenant_id;
  DELETE FROM public.hidden_tags WHERE tenant_id = p_tenant_id;
  DELETE FROM public.author_clicks WHERE tenant_id = p_tenant_id;
  DELETE FROM public.section_clicks WHERE tenant_id = p_tenant_id;
  DELETE FROM public.saved_ad_quotes WHERE tenant_id = p_tenant_id;

  DELETE FROM public.article_sections
  WHERE article_id IN (SELECT id FROM public.articles WHERE tenant_id = p_tenant_id);

  DELETE FROM public.articles WHERE tenant_id = p_tenant_id;

  -- Memberships / newsletter subs use ON DELETE CASCADE on tenant_id
  DELETE FROM public.tenants WHERE id = p_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tenant_fully(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant_fully(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_tenant_fully IS
  'Super-admin only via service role: removes tenant and dependent rows; blocks slug spring-ford.';
