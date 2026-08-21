CREATE TABLE public.money_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  start_month DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_rounds TO authenticated;
GRANT ALL ON public.money_rounds TO service_role;
ALTER TABLE public.money_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own rounds" ON public.money_rounds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.round_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.money_rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  position INTEGER NOT NULL,
  is_me BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_members TO authenticated;
GRANT ALL ON public.round_members TO service_role;
ALTER TABLE public.round_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage members of their rounds" ON public.round_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.money_rounds r WHERE r.id = round_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.money_rounds r WHERE r.id = round_id AND r.user_id = auth.uid()));

CREATE TABLE public.round_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.money_rounds(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.round_members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  month DATE NOT NULL,
  month_index INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_number TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_entries TO authenticated;
GRANT ALL ON public.round_entries TO service_role;
ALTER TABLE public.round_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage entries of their rounds" ON public.round_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.money_rounds r WHERE r.id = round_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.money_rounds r WHERE r.id = round_id AND r.user_id = auth.uid()));

CREATE TRIGGER update_money_rounds_updated_at BEFORE UPDATE ON public.money_rounds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();