CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email);

  INSERT INTO public.portfolios (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = lower(_email);
  IF _uid IS NULL THEN RAISE EXCEPTION 'No account found for %', _email; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN 'admin granted to ' || _email;
END; $function$;

CREATE OR REPLACE FUNCTION public.revoke_admin_by_email(_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = lower(_email);
  IF _uid IS NULL THEN RAISE EXCEPTION 'No account found for %', _email; END IF;
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'You cannot revoke your own admin access'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'admin';
  RETURN 'admin revoked from ' || _email;
END; $function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_email(text) TO authenticated;