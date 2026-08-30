DROP POLICY IF EXISTS "admins read all portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "admins update all portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "admins manage all investments" ON public.investments;

CREATE POLICY "admins read all portfolios" ON public.portfolios
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admins update all portfolios" ON public.portfolios
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins manage all investments" ON public.investments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.guard_portfolio_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.total_invested IS DISTINCT FROM OLD.total_invested
       OR NEW.total_profit IS DISTINCT FROM OLD.total_profit
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Not allowed: portfolio financial values are managed by Genuine Investment';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_profile_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.invested IS DISTINCT FROM OLD.invested
       OR NEW.total_deposits IS DISTINCT FROM OLD.total_deposits
       OR NEW.total_withdrawals IS DISTINCT FROM OLD.total_withdrawals
       OR NEW.verified IS DISTINCT FROM OLD.verified
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Not allowed: account financial values are managed by Genuine Investment';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.force_transaction_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.user_id := auth.uid();
    NEW.status := 'pending';
    NEW.admin_note := NULL;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.guard_portfolio_financials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_financials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.force_transaction_owner() FROM PUBLIC, anon, authenticated;