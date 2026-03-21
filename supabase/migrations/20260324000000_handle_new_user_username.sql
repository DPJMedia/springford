-- Persist username from auth metadata when new users are created; backfill + clean bad avatar_url values

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, username, is_super_admin, newsletter_subscribed)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    CASE WHEN NEW.email = 'dylancobb2525@gmail.com' THEN true ELSE false END,
    COALESCE((NEW.raw_user_meta_data->>'newsletter_subscribed')::boolean, false)
  );
  RETURN NEW;
END;
$function$;

-- Backfill username from auth.users metadata where profile row never got it
UPDATE public.user_profiles up
SET username = v.u
FROM auth.users au,
LATERAL (
  SELECT NULLIF(TRIM(au.raw_user_meta_data->>'username'), '') AS u
) v
WHERE up.id = au.id
  AND v.u IS NOT NULL
  AND (up.username IS NULL OR btrim(COALESCE(up.username, '')) = '')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles o
    WHERE o.username = v.u AND o.id <> up.id
  );

-- Remove junk avatar values that break <img src> or show "undefined"
UPDATE public.user_profiles
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND (
    btrim(avatar_url) = ''
    OR lower(avatar_url) IN ('undefined', 'null')
  );
