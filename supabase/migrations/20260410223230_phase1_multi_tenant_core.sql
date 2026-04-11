-- Applied to remote DB via Supabase MCP: migration name phase1_multi_tenant_core, version 20260410223230.

-- =============================================================================
-- Phase 1: Multi-tenant foundation (additive only; non-breaking for production)
--
-- ROLLBACK (manual — run only on empty/failed deploy before production depends on it):
--   DROP INDEX IF EXISTS public.idx_hidden_tags_tenant_id;
--   ... (all idx_*_tenant_id)
--   ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_tenant_id_slug_key;
--   ALTER TABLE public.articles ADD CONSTRAINT articles_slug_key UNIQUE (slug);
--   ALTER TABLE ... DROP COLUMN tenant_id; (each table, order: children before tenants)
--   DROP TABLE IF EXISTS public.tenant_memberships;
--   DROP TABLE IF EXISTS public.tenant_newsletter_subscriptions;
--   DROP TABLE IF EXISTS public.tenants;
-- =============================================================================


CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domain text NOT NULL UNIQUE,
  from_email text NOT NULL,
  from_name text NOT NULL,
  section_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenants IS 'Per-site configuration. Rollback: DROP TABLE public.tenants CASCADE after dropping FK columns.';

INSERT INTO public.tenants (name, slug, domain, from_email, from_name, section_config, is_active)
SELECT
  'Spring-Ford Press',
  'spring-ford',
  'springford.press',
  'admin@dpjmedia.com',
  'Spring-Ford Press',
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'slug', lower(regexp_replace(trim(s.name), '\s+', '-', 'g')),
          'label', s.name
        )
        ORDER BY s.name
      )
      FROM public.sections s
    ),
    '[]'::jsonb
  ),
  true;

ALTER TABLE public.articles ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.ads ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.ad_slot_assignments ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.ad_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.notifications ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.editors_picks ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.newsletter_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.newsletter_campaigns ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.newsletter_email_events ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.saved_ad_quotes ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.page_views ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.ad_impressions ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.ad_clicks ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.author_clicks ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.section_clicks ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.article_scroll_data ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.diffuse_connections ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.diffuse_imported_articles ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.hidden_tags ADD COLUMN tenant_id uuid REFERENCES public.tenants (id);

UPDATE public.articles SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.ads SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.ad_slot_assignments SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.ad_settings SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.notifications SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.editors_picks SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.newsletter_templates SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.newsletter_campaigns SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.newsletter_email_events SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.saved_ad_quotes SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.page_views SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.ad_impressions SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.ad_clicks SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.author_clicks SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.section_clicks SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.article_scroll_data SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.diffuse_connections SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.diffuse_imported_articles SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);
UPDATE public.hidden_tags SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1);

CREATE TABLE public.tenant_newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  subscribed boolean NOT NULL DEFAULT false,
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  UNIQUE (user_id, tenant_id)
);

COMMENT ON TABLE public.tenant_newsletter_subscriptions IS 'Per-tenant newsletter opt-in. Rollback: DROP TABLE public.tenant_newsletter_subscriptions;';

INSERT INTO public.tenant_newsletter_subscriptions (user_id, tenant_id, subscribed, subscribed_at)
SELECT
  up.id,
  (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1),
  true,
  up.newsletter_subscribed_at
FROM public.user_profiles up
WHERE up.newsletter_subscribed = true;

CREATE TABLE public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'reader')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

COMMENT ON TABLE public.tenant_memberships IS 'Per-tenant roles. Rollback: DROP TABLE public.tenant_memberships;';

INSERT INTO public.tenant_memberships (user_id, tenant_id, role)
SELECT
  up.id,
  (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1),
  'admin'::text
FROM public.user_profiles up
WHERE up.is_admin = true OR up.is_super_admin = true;

ALTER TABLE public.articles DROP CONSTRAINT articles_slug_key;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_tenant_id_slug_key UNIQUE (tenant_id, slug);

CREATE INDEX idx_articles_tenant_id ON public.articles (tenant_id);
CREATE INDEX idx_ads_tenant_id ON public.ads (tenant_id);
CREATE INDEX idx_ad_slot_assignments_tenant_id ON public.ad_slot_assignments (tenant_id);
CREATE INDEX idx_ad_settings_tenant_id ON public.ad_settings (tenant_id);
CREATE INDEX idx_notifications_tenant_id ON public.notifications (tenant_id);
CREATE INDEX idx_editors_picks_tenant_id ON public.editors_picks (tenant_id);
CREATE INDEX idx_newsletter_templates_tenant_id ON public.newsletter_templates (tenant_id);
CREATE INDEX idx_newsletter_campaigns_tenant_id ON public.newsletter_campaigns (tenant_id);
CREATE INDEX idx_newsletter_email_events_tenant_id ON public.newsletter_email_events (tenant_id);
CREATE INDEX idx_saved_ad_quotes_tenant_id ON public.saved_ad_quotes (tenant_id);
CREATE INDEX idx_page_views_tenant_id ON public.page_views (tenant_id);
CREATE INDEX idx_ad_impressions_tenant_id ON public.ad_impressions (tenant_id);
CREATE INDEX idx_ad_clicks_tenant_id ON public.ad_clicks (tenant_id);
CREATE INDEX idx_author_clicks_tenant_id ON public.author_clicks (tenant_id);
CREATE INDEX idx_section_clicks_tenant_id ON public.section_clicks (tenant_id);
CREATE INDEX idx_article_scroll_data_tenant_id ON public.article_scroll_data (tenant_id);
CREATE INDEX idx_diffuse_connections_tenant_id ON public.diffuse_connections (tenant_id);
CREATE INDEX idx_diffuse_imported_articles_tenant_id ON public.diffuse_imported_articles (tenant_id);
CREATE INDEX idx_hidden_tags_tenant_id ON public.hidden_tags (tenant_id);

CREATE INDEX idx_tenant_newsletter_subscriptions_tenant_id ON public.tenant_newsletter_subscriptions (tenant_id);
CREATE INDEX idx_tenant_newsletter_subscriptions_user_id ON public.tenant_newsletter_subscriptions (user_id);
CREATE INDEX idx_tenant_memberships_tenant_id ON public.tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_user_id ON public.tenant_memberships (user_id);

