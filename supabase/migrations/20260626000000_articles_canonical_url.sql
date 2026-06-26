-- Cross-network syndication support: a nullable canonical URL on articles.
--
-- When a Diffuse output is cross-posted to more than one Press tenant, the first
-- import is the canonical original and later copies store that original's URL here.
-- The article page renders it as <link rel="canonical"> and in NewsArticle JSON-LD,
-- so syndicated copies point search engines at one origin instead of competing as
-- duplicate content. NULL = self-canonical (the normal case / the original).
--
-- Additive and nullable: zero impact on existing rows or behavior.

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS canonical_url text;

COMMENT ON COLUMN public.articles.canonical_url IS
  'Absolute canonical URL for syndicated/cross-posted copies. NULL = self-canonical.';
