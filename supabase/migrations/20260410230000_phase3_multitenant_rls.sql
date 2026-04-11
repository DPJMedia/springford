-- phase3 multitenant: additive RLS for tenant-scoped admin paths.
-- Existing permissive policies remain; these add access via tenant_memberships.

-- newsletter_templates: editors/admins for matching tenant
CREATE POLICY "phase3 multitenant newsletter_templates tenant_members"
  ON public.newsletter_templates
  FOR ALL
  USING (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = newsletter_templates.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = newsletter_templates.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  );

COMMENT ON POLICY "phase3 multitenant newsletter_templates tenant_members" ON public.newsletter_templates IS
  'phase3 multitenant — tenant role can manage rows for that tenant_id';

-- newsletter_campaigns
CREATE POLICY "phase3 multitenant newsletter_campaigns tenant_members"
  ON public.newsletter_campaigns
  FOR ALL
  USING (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = newsletter_campaigns.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = newsletter_campaigns.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  );

COMMENT ON POLICY "phase3 multitenant newsletter_campaigns tenant_members" ON public.newsletter_campaigns IS
  'phase3 multitenant';

-- editors_picks: scope writes to tenant (reads stay covered by existing public policy)
CREATE POLICY "phase3 multitenant editors_picks tenant_members_write"
  ON public.editors_picks
  FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = editors_picks.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "phase3 multitenant editors_picks tenant_members_update"
  ON public.editors_picks
  FOR UPDATE
  USING (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = editors_picks.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = editors_picks.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "phase3 multitenant editors_picks tenant_members_delete"
  ON public.editors_picks
  FOR DELETE
  USING (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = editors_picks.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
  );

COMMENT ON POLICY "phase3 multitenant editors_picks tenant_members_write" ON public.editors_picks IS 'phase3 multitenant';
COMMENT ON POLICY "phase3 multitenant editors_picks tenant_members_update" ON public.editors_picks IS 'phase3 multitenant';
COMMENT ON POLICY "phase3 multitenant editors_picks tenant_members_delete" ON public.editors_picks IS 'phase3 multitenant';

-- Public SELECT scoped by tenant_id requires a tenant claim in JWT or session (Phase 4).
-- App-layer filtering + existing audience policies remain in effect for articles/ads.
