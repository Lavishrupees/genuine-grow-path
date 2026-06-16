CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "admins insert chat" ON public.chat_messages;
DROP POLICY IF EXISTS "admins read all chat" ON public.chat_messages;
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins read all tx" ON public.transactions;
DROP POLICY IF EXISTS "admins update tx" ON public.transactions;
DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;

CREATE POLICY "admins insert chat" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins read all chat" ON public.chat_messages
FOR SELECT TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins read all tx" ON public.transactions
FOR SELECT TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update tx" ON public.transactions
FOR UPDATE TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins read all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));