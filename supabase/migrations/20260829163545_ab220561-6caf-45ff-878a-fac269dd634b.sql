CREATE POLICY "auth delete sales" ON public.sales FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth delete sale items" ON public.sale_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth delete movements" ON public.stock_movements FOR DELETE TO authenticated USING (true);