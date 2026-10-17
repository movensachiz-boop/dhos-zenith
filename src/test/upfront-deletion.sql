-- Run against Lovable Cloud; the exception block rolls back every fixture.
DO $$
DECLARE
  number text := 'TEST-UP-' || gen_random_uuid()::text;
BEGIN
  BEGIN
    INSERT INTO public.quotations (doc_number, doc_type, lines, subtotal, total, amount_paid, balance_due, branch)
      VALUES (number, 'upfront', '[]', 200, 200, 50, 150, 'maita'),
             (number || '-W', 'upfront', '[]', 200, 200, 50, 150, 'woodlands');
    INSERT INTO public.sales (receipt_number, doc_type, subtotal, total, amount_paid, balance_due, payment_method, branch)
      VALUES (number, 'upfront', 200, 200, 50, 150, 'cash', 'maita'),
             (number || '-W', 'upfront', 200, 200, 50, 150, 'cash', 'woodlands');
    DELETE FROM public.quotations WHERE doc_number = number AND branch = 'maita';
    IF EXISTS (SELECT 1 FROM public.sales WHERE receipt_number = number AND branch = 'maita') THEN
      RAISE EXCEPTION 'Deleted document still has a dashboard payment';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE receipt_number = number || '-W' AND branch = 'woodlands' AND amount_paid = 50 AND balance_due = 150) THEN
      RAISE EXCEPTION 'Deletion affected another branch';
    END IF;
    DELETE FROM public.sales WHERE receipt_number = number || '-W' AND branch = 'woodlands';
    IF EXISTS (SELECT 1 FROM public.quotations WHERE doc_number IN (number, number || '-W')) THEN
      RAISE EXCEPTION 'Deleted payment still has an upfront document';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P9001', MESSAGE = 'Tests passed; rollback fixtures';
  EXCEPTION WHEN SQLSTATE 'P9001' THEN
    RAISE NOTICE 'Upfront deletion and branch isolation tests passed';
  END;
END $$;