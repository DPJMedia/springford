-- Diffuse imports: allow the same Diffuse output to be imported once per tenant (not globally).
-- Replaces UNIQUE(diffuse_output_id) with UNIQUE(tenant_id, diffuse_output_id).

UPDATE public.diffuse_imported_articles
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'spring-ford' LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE public.diffuse_imported_articles
  DROP CONSTRAINT diffuse_imported_articles_diffuse_output_id_key;

ALTER TABLE public.diffuse_imported_articles
  ADD CONSTRAINT diffuse_imported_articles_tenant_id_diffuse_output_id_key
  UNIQUE (tenant_id, diffuse_output_id);

ALTER TABLE public.diffuse_imported_articles
  ALTER COLUMN tenant_id SET NOT NULL;
