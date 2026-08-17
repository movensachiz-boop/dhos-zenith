
-- Customer numbers + referral credits on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS referral_credits numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by text;

-- Backfill existing clients with a customer number
UPDATE public.clients
  SET customer_number = 'MC' || lpad((floor(random()*100000))::int::text, 5, '0')
  WHERE customer_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_customer_number_key ON public.clients (customer_number);

-- Sale-level customer / referral info
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS referral_code text;
