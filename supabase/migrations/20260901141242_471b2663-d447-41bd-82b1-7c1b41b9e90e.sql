-- Customers may read but never write their own portfolio; admins manage all.
DROP POLICY IF EXISTS "users update own portfolio" ON public.portfolios;
DROP POLICY IF EXISTS "users insert own portfolio" ON public.portfolios;

-- Guarantee one portfolio row per user (single source of truth)
CREATE UNIQUE INDEX IF NOT EXISTS portfolios_user_id_key ON public.portfolios(user_id);

-- Backfill: every existing account must have a portfolio row
INSERT INTO public.portfolios (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.portfolios pf ON pf.user_id = p.id
WHERE pf.user_id IS NULL;

-- Admins can create a portfolio if one is ever missing
CREATE POLICY "admins insert portfolios" ON public.portfolios
FOR INSERT TO authenticated WITH CHECK (public.is_admin());