CREATE OR REPLACE FUNCTION public.sync_upfront_deletion() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF OLD.doc_type = 'upfront' THEN
    IF TG_TABLE_NAME = 'quotations' THEN
      DELETE FROM public.stock_movements WHERE branch = OLD.branch AND reference IN (SELECT id::text FROM public.sales WHERE receipt_number = OLD.doc_number AND branch = OLD.branch AND doc_type = 'upfront');
      DELETE FROM public.sale_items WHERE branch = OLD.branch AND sale_id IN (SELECT id FROM public.sales WHERE receipt_number = OLD.doc_number AND branch = OLD.branch AND doc_type = 'upfront');
      DELETE FROM public.sales WHERE receipt_number = OLD.doc_number AND branch = OLD.branch AND doc_type = 'upfront';
    ELSE
      DELETE FROM public.quotations WHERE doc_number = OLD.receipt_number AND branch = OLD.branch AND doc_type = 'upfront';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_upfront_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_upfront_deletion() TO authenticated, service_role;
CREATE TRIGGER quotations_sync_upfront_deletion AFTER DELETE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.sync_upfront_deletion();
CREATE TRIGGER sales_sync_upfront_deletion AFTER DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.sync_upfront_deletion();