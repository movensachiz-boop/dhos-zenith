CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number text NOT NULL UNIQUE,
  doc_type text NOT NULL DEFAULT 'quote',
  customer_name text,
  customer_phone text,
  customer_number text,
  customer_address text,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  payment_method text,
  valid_until date,
  due_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage quotations" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER quotations_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  vendor text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  paid_on date NOT NULL DEFAULT (now()::date),
  receipt_number text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'accessory';
ALTER TABLE public.money_rounds ADD COLUMN IF NOT EXISTS cycle_days integer NOT NULL DEFAULT 30;
ALTER TABLE public.money_rounds ADD COLUMN IF NOT EXISTS start_date date;
UPDATE public.money_rounds SET start_date = start_month WHERE start_date IS NULL;