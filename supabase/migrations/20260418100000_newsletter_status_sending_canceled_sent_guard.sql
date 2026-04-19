-- Allow intermediate + terminal states for scheduling, and block autosave from
-- downgrading a sent campaign back to scheduled (race with cron + open editor).
--
-- Applies to ALL tenants: `newsletter_campaigns` is multitenant (tenant_id); new tenants
-- use the same table and constraints automatically after this migration runs once per DB.

ALTER TABLE public.newsletter_campaigns
  DROP CONSTRAINT IF EXISTS newsletter_campaigns_status_check;

ALTER TABLE public.newsletter_campaigns
  ADD CONSTRAINT newsletter_campaigns_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'scheduled'::text,
        'sending'::text,
        'sent'::text,
        'canceled'::text
      ]
    )
  );

CREATE OR REPLACE FUNCTION public.newsletter_campaigns_preserve_sent_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'sent' AND NEW.status = 'scheduled' THEN
    NEW.status := 'sent';
    NEW.scheduled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS newsletter_campaigns_preserve_sent ON public.newsletter_campaigns;

CREATE TRIGGER newsletter_campaigns_preserve_sent
  BEFORE UPDATE ON public.newsletter_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.newsletter_campaigns_preserve_sent_status();

COMMENT ON FUNCTION public.newsletter_campaigns_preserve_sent_status() IS
  'Prevents client autosave from resetting status from sent to scheduled when scheduled_at is still set in stale UI state.';
