CREATE TABLE public.injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  received_on date NOT NULL DEFAULT (now())::date,
  due_date date,
  reference text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.injections TO authenticated;
GRANT ALL ON public.injections TO service_role;
ALTER TABLE public.injections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage injections" ON public.injections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER injections_updated BEFORE UPDATE ON public.injections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.injection_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  injection_id uuid NOT NULL REFERENCES public.injections(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  paid_on date NOT NULL DEFAULT (now())::date,
  receipt_number text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.injection_repayments TO authenticated;
GRANT ALL ON public.injection_repayments TO service_role;
ALTER TABLE public.injection_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage injection repayments" ON public.injection_repayments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_injection_repayments_injection ON public.injection_repayments(injection_id);