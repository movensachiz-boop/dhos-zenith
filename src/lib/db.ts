import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  product_type: string | null;
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
  productType: (r.product_type === 'cake' ? 'cake' : 'accessory'),
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

// Renew the login token before it expires so saves never fail with "JWT expired".
export async function ensureFreshSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const msLeft = (session.expires_at ?? 0) * 1000 - Date.now();
    if (msLeft < 15 * 60 * 1000) await supabase.auth.refreshSession();
  } catch {
    // offline or refresh failed — let the actual request surface the error
  }
}

// Run a request; if it fails because the token expired, refresh once and retry.
export async function withFreshSession<T>(fn: () => Promise<T>): Promise<T> {
  await ensureFreshSession();
  const result = await fn();
  const err = (result as { error?: { message?: string } | null })?.error;
  if (err?.message && /jwt expired|token expired|invalid jwt/i.test(err.message)) {
    await supabase.auth.refreshSession();
    return fn();
  }
  return result;
}

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
