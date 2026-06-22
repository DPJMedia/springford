-- AI-assisted article flag + sponsor URL for sponsored byline external links.
--
-- ai_assisted: when true, a small italic disclaimer renders below the byline on
--   the public article page ("This article was generated with AI assistance.
--   All content was reviewed, edited, and fact-checked by {author}").
-- sponsor_url: optional external URL. When the article is also marked as an
--   advertisement, the byline name will link to this external URL (new tab)
--   instead of the internal author page.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS ai_assisted boolean NOT NULL DEFAULT false;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS sponsor_url text;
