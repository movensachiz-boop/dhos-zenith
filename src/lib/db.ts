import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  cost_price: number;
  selling_price: number;
  vat_applicable: boolean;
  unit_of_measure: string;
  stock_tracking_enabled: boolean;
  current_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
};

export const rowToProduct = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  sku: r.sku,
  barcode: r.barcode ?? undefined,
  category: r.category,
  costPrice: Number(r.cost_price),
  sellingPrice: Number(r.selling_price),
  vatApplicable: r.vat_applicable,
  unitOfMeasure: r.unit_of_measure,
  stockTrackingEnabled: r.stock_tracking_enabled,
  currentStock: Number(r.current_stock),
  lowStockThreshold: Number(r.low_stock_threshold),
  createdAt: new Date(r.created_at),
  updatedAt: new Date(r.updated_at),
});

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(rowToProduct);
}

export async function logAudit(action: string, entity: string, entityId?: string, details?: Record<string, unknown>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('audit_logs').insert({
    user_id: auth.user.id,
    user_name: auth.user.email ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    details: (details ?? null) as never,
  });
}

export const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
