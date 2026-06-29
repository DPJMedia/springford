-- AI disclaimer fix: credit a REAL author as the fact-checker, not the byline.
--
-- An AI-assisted article often has the byline "Powered by diffuse.ai", but the
-- disclaimer ("reviewed, edited, and fact-checked by ...") must name the real
-- person who verified it. This adds a dedicated FK to a managed author, required
-- by the editor whenever the AI disclaimer is enabled.
--
-- Additive and nullable: zero impact on existing rows or behavior.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS ai_fact_checker_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.articles.ai_fact_checker_id IS
  'Managed author who fact-checked an AI-assisted article; shown in the AI disclaimer. Never the Diffuse byline.';
