-- Atomic remove of one ad↔slot assignment from admin preview; updates ads.ad_slot to a remaining slot or 'unassigned'.
-- Super admins only (matches app gating).

CREATE OR REPLACE FUNCTION public.remove_ad_from_slot(p_ad_id uuid, p_ad_slot text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_super_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.ad_slot_assignments
  WHERE ad_id = p_ad_id AND ad_slot = p_ad_slot;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    UPDATE public.ads AS a
    SET ad_slot = COALESCE(
      (
        SELECT s.ad_slot
        FROM public.ad_slot_assignments AS s
        WHERE s.ad_id = p_ad_id
        ORDER BY s.ad_slot
        LIMIT 1
      ),
      'unassigned'::text
    )
    WHERE a.id = p_ad_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.remove_ad_from_slot(uuid, text) IS
  'Admin preview: remove one slot assignment; sets ads.ad_slot to another assigned slot or unassigned.';

REVOKE ALL ON FUNCTION public.remove_ad_from_slot(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_ad_from_slot(uuid, text) TO authenticated;
