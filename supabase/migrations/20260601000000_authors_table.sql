-- Authors as first-class entities, separate from user accounts.
-- One author can be shared across multiple tenant sites (many-to-many).
-- Articles reference authors via primary_author_id / co_author_id.
-- The legacy `author_name` text column is kept and continues to be written
-- so existing display paths keep working without back-patching every read.

-- ─────────────────────────────────────────────────────────────────────
-- 1. authors
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.authors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  title           text,
  bio             text,
  email           text,
  avatar_url      text,
  cover_image_url text,
  twitter_handle  text,
  linkedin_url    text,
  website_url     text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authors_slug_idx ON public.authors(slug);
CREATE INDEX IF NOT EXISTS authors_name_idx ON public.authors(lower(name));

CREATE OR REPLACE FUNCTION public.authors_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
-- Pinned search_path prevents the linter warning + a small attack surface
-- where a session with a hostile search_path could shadow `now()`.
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_authors_updated_at ON public.authors;
CREATE TRIGGER trg_authors_updated_at
  BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.authors_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- 2. author_tenants  (many-to-many)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.author_tenants (
  author_id   uuid NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (author_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS author_tenants_tenant_idx ON public.author_tenants(tenant_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. articles: add primary_author_id + co_author_id (nullable)
--    Existing `author_id` (which currently stores the *editor's* user id)
--    is left alone to avoid breaking the current publish flow.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS primary_author_id uuid
    REFERENCES public.authors(id) ON DELETE SET NULL;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS co_author_id uuid
    REFERENCES public.authors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS articles_primary_author_idx
  ON public.articles(primary_author_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. RLS — public read on authors + author_tenants (used by article pages
--    and the public /author/[slug] route). Admin writes go through the
--    service-role API routes, so no INSERT/UPDATE/DELETE policies for the
--    anon/authenticated roles.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.authors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authors_public_read         ON public.authors;
DROP POLICY IF EXISTS author_tenants_public_read  ON public.author_tenants;

CREATE POLICY authors_public_read
  ON public.authors
  FOR SELECT
  USING (true);

CREATE POLICY author_tenants_public_read
  ON public.author_tenants
  FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Storage bucket for author images (avatars + cover/thumbnail cards)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('author-images', 'author-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "author-images public read"  ON storage.objects;
DROP POLICY IF EXISTS "author-images service write" ON storage.objects;

CREATE POLICY "author-images public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'author-images');

-- Authenticated admins write through API routes (service role bypasses RLS
-- anyway). Allow any authenticated user to upload here so client-side
-- uploads from the admin UI work when a session cookie is present.
CREATE POLICY "author-images service write"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'author-images')
  WITH CHECK (bucket_id = 'author-images');
