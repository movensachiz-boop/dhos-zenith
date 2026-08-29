DELETE FROM public.stock_movements WHERE reference IN (SELECT receipt_number FROM public.sales WHERE receipt_number <> 'UP-122602');
DELETE FROM public.sale_items WHERE sale_id IN (SELECT id FROM public.sales WHERE receipt_number <> 'UP-122602');
DELETE FROM public.sales WHERE receipt_number <> 'UP-122602';