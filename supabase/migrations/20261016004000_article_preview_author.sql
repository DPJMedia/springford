-- Preserve legacy author-ID filtering on body-free public feeds.
BEGIN;
CREATE OR REPLACE VIEW public.article_previews WITH (security_barrier = true) AS
SELECT id, tenant_id, title, slug, subtitle, excerpt, image_url, published_at, author_name,
  primary_author_id, co_author_id, sections, section, category, tags, is_advertisement,
  sponsor_url, ai_assisted, is_breaking, visibility, is_featured, breaking_news_set_at,
  breaking_news_duration, share_count, view_count, created_at, updated_at, status,
  meta_title, meta_description, canonical_url, author_id
FROM public.articles
WHERE status = 'published' AND published_at <= now()
  AND (COALESCE(visibility, 'public') IN ('public','newsletter_subscribers')
    OR (auth.uid() IS NOT NULL AND app_private.can_manage_tenant(tenant_id)));
GRANT SELECT ON public.article_previews TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
