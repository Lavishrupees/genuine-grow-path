-- 1. PORTFOLIOS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolios (
  portfolio_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  total_invested numeric NOT NULL DEFAULT 0,
  total_profit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.portfolios TO authenticated;
GRANT UPDATE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own portfolio" ON public.portfolios
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all portfolios" ON public.portfolios
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users insert own portfolio" ON public.portfolios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own portfolio" ON public.portfolios
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins update all portfolios" ON public.portfolios
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_portfolios_updated BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Clients may never change their own money figures; only admins/service role can.
CREATE OR REPLACE FUNCTION public.guard_portfolio_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.total_invested IS DISTINCT FROM OLD.total_invested
       OR NEW.total_profit IS DISTINCT FROM OLD.total_profit
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Not allowed: portfolio financial values are managed by Genuine Investment';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_portfolios_guard BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.guard_portfolio_financials();

-- 2. INVESTMENT RECORDS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES public.portfolios(portfolio_id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'Starter',
  amount_invested numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT current_date,
  maturity_date date,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own investments" ON public.investments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage all investments" ON public.investments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_investments_updated BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_investments_user ON public.investments(user_id);

-- 3. AUTO-CREATE PORTFOLIO ON SIGNUP ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first boolean;
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

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- Backfill portfolios for existing clients from their profile figures.
INSERT INTO public.portfolios (user_id, balance, total_invested, total_profit)
SELECT p.id, p.balance, p.invested, GREATEST(p.invested - p.total_deposits, 0)
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- 4. PROFILE FINANCIAL GUARD -------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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

CREATE TRIGGER trg_profiles_guard BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_financials();

-- 5. TRANSACTIONS ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.force_transaction_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.user_id := auth.uid();
    NEW.status := 'pending';
    NEW.admin_note := NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_transactions_owner BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.force_transaction_owner();

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);