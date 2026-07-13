-- Community calendar: per-tenant events + linked articles shown on the public /calendar page.
-- Additive only, and fully idempotent (safe to re-run). Rollback:
--   DROP TABLE public.calendar_events CASCADE;
--   DROP FUNCTION IF EXISTS public.calendar_events_set_updated_at();

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  event_date date NOT NULL,
  -- 'event' = standalone community event; 'article' = a published article surfaced on a date
  entry_type text NOT NULL DEFAULT 'event' CHECK (entry_type IN ('event', 'article')),
  title text NOT NULL,
  description text,
  -- Hex color for the day chip, e.g. '#2563eb'. NULL = default.
  color text,
  image_url text,
  -- Set for entry_type='article' (and optional linking on events). Cascades if the article is deleted.
  article_id uuid REFERENCES public.articles (id) ON DELETE CASCADE,
  start_time time,
  end_time time,
  location text,
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.calendar_events IS 'Community calendar entries (events + linked articles), tenant-scoped. Additive; rollback: DROP TABLE.';

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_date ON public.calendar_events (tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_article_id ON public.calendar_events (article_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Public read: the calendar is public-facing; tenant scoping is applied in the app layer
-- (same model as the rest of the site's public content).
DROP POLICY IF EXISTS "calendar_events public read" ON public.calendar_events;
CREATE POLICY "calendar_events public read"
  ON public.calendar_events
  FOR SELECT
  USING (true);

-- Writes: tenant admins/editors for that tenant, or global admins/super-admins
-- (mirrors the existing authorization model used elsewhere in the app).
DROP POLICY IF EXISTS "calendar_events tenant admins write" ON public.calendar_events;
CREATE POLICY "calendar_events tenant admins write"
  ON public.calendar_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = calendar_events.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin OR up.is_super_admin)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = calendar_events.tenant_id
        AND tm.role IN ('admin', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin OR up.is_super_admin)
    )
  );

CREATE OR REPLACE FUNCTION public.calendar_events_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.calendar_events_set_updated_at();
