CREATE OR REPLACE FUNCTION public.current_branch()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-branch', ''), 'maita')
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_logs','categories','clients','expenses','injection_repayments','injections','money_rounds','products','quotations','round_entries','round_members','sale_items','sales','settings','stock_movements','suppliers','transporters']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT ''maita''', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN branch SET DEFAULT public.current_branch()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(branch)', t || '_branch_idx', t);
    EXECUTE format('CREATE POLICY "Branch isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (branch = public.current_branch()) WITH CHECK (branch = public.current_branch())', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.clear_branch_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b text := public.current_branch();
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only admins can clear data';
  END IF;
  DELETE FROM public.round_entries WHERE branch = b;
  DELETE FROM public.round_members WHERE branch = b;
  DELETE FROM public.money_rounds WHERE branch = b;
  DELETE FROM public.injection_repayments WHERE branch = b;
  DELETE FROM public.injections WHERE branch = b;
  DELETE FROM public.stock_movements WHERE branch = b;
  DELETE FROM public.sale_items WHERE branch = b;
  DELETE FROM public.sales WHERE branch = b;
  DELETE FROM public.quotations WHERE branch = b;
  DELETE FROM public.expenses WHERE branch = b;
  DELETE FROM public.products WHERE branch = b;
  DELETE FROM public.categories WHERE branch = b;
  DELETE FROM public.clients WHERE branch = b;
  DELETE FROM public.suppliers WHERE branch = b;
  DELETE FROM public.transporters WHERE branch = b;
END $$;
REVOKE ALL ON FUNCTION public.clear_branch_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_branch_data() TO authenticated;