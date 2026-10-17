import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts } from '@/lib/db';
import { Product } from '@/types';
import { useCachedState, isOffline } from '@/lib/cache';

type Sale = {
  id: string;
  receipt_number: string;
  doc_type: string;
  total: number;
  vat_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  cashier_name: string | null;
};

const ranges = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: 'all', label: 'All time', days: 3650 },
];

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total: number;
  created_at: string;
};

export default function Reports() {
  const [sales, setSales, hadCache] = useCachedState<Sale[]>('mc_sales_cache', []);
  const [items, setItems] = useCachedState<SaleItem[]>('mc_sale_items_cache', []);
  const [products, setProducts] = useCachedState<Product[]>('mc_products_cache', []);
  const [expenses, setExpenses] = useCachedState<{ amount: number; paid_on: string }[]>('mc_expenses_report_cache', []);
  const [injections, setInjections] = useCachedState<{ amount: number }[]>('mc_injections_report_cache', []);
  const [injRepayments, setInjRepayments] = useCachedState<{ amount: number }[]>('mc_injection_repayments_report_cache', []);
  const [loading, setLoading] = useState(!hadCache);
  const [range, setRange] = useState('30');

  const load = useCallback(async () => {
    if (isOffline()) { setLoading(false); return; }
    const [salesRes, itemsRes, expensesRes, injRes, repRes, productList] = await Promise.all([
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('sale_items').select('*'),
      supabase.from('expenses').select('amount, paid_on'),
      supabase.from('injections').select('amount'),
      supabase.from('injection_repayments').select('amount'),
      fetchProducts().catch(() => [] as Product[]),
    ]);
    if (salesRes.error) {
      toast({ title: 'Failed to load report data', description: salesRes.error.message, variant: 'destructive' });
    } else {
      setSales((salesRes.data ?? []) as unknown as Sale[]);
      setItems((itemsRes.data ?? []) as unknown as SaleItem[]);
      setExpenses((expensesRes.data ?? []) as { amount: number; paid_on: string }[]);
      setInjections((injRes.data ?? []) as { amount: number }[]);
      setInjRepayments((repRes.data ?? []) as { amount: number }[]);
      if (productList.length) setProducts(productList);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('mc-payments-changed', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('mc-payments-changed', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('reports-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);


  const filtered = useMemo(() => {
    const def = ranges.find(r => r.key === range)!;
    const start = new Date();
    if (def.key === 'today') start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - def.days);
    return sales.filter(s => s.status !== 'voided' && new Date(s.created_at) >= start);
  }, [sales, range]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, r) => s + Number(r.total), 0);
    const vat = filtered.reduce((s, r) => s + Number(r.vat_amount), 0);
    const byPayment = filtered.reduce<Record<string, number>>((acc, r) => {
      acc[r.payment_method] = (acc[r.payment_method] ?? 0) + Number(r.total);
      return acc;
    }, {});
    return { revenue, vat, count: filtered.length, avg: filtered.length ? revenue / filtered.length : 0, byPayment };
  }, [filtered]);

  const split = useMemo(() => {
    const typeById = new Map(products.map(p => [p.id, p.productType]));
    const validIds = new Set(filtered.map(s => s.id));
    const rows = items.filter(i => validIds.has(i.sale_id));
    const acc = { cake: { revenue: 0, qty: 0 }, accessory: { revenue: 0, qty: 0 } };
    rows.forEach(i => {
      const type = (i.product_id && typeById.get(i.product_id)) || 'accessory';
      acc[type === 'cake' ? 'cake' : 'accessory'].revenue += Number(i.line_total);
      acc[type === 'cake' ? 'cake' : 'accessory'].qty += Number(i.quantity);
    });
    return acc;
  }, [items, filtered, products]);

  const periodExpenses = useMemo(() => {
    const def = ranges.find(r => r.key === range)!;
    const start = new Date();
    if (def.key === 'today') start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - def.days);
    return expenses.filter(e => new Date(e.paid_on) >= start).reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses, range]);

  const fastMovers = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const twoWeeks = Date.now() - 14 * 86400000;
    const live = new Set(sales.filter(s => s.status !== 'voided').map(s => s.id));
    const saleDate = new Map(sales.map(s => [s.id, new Date(s.created_at).getTime()]));
    const acc = new Map<string, { name: string; id: string | null; week: number; prev: number }>();
    items.forEach(i => {
      if (!live.has(i.sale_id)) return;
      const t = saleDate.get(i.sale_id) ?? 0;
      if (t < twoWeeks) return;
      const k = i.product_id ?? i.product_name;
      const row = acc.get(k) ?? { name: i.product_name, id: i.product_id, week: 0, prev: 0 };
      if (t >= weekAgo) row.week += Number(i.quantity); else row.prev += Number(i.quantity);
      acc.set(k, row);
    });
    const byId = new Map(products.map(p => [p.id, p]));
    return [...acc.values()].filter(r => r.week > 0).sort((a, b) => b.week - a.week).slice(0, 10).map(r => {
      const p = r.id ? byId.get(r.id) : undefined;
      const stock = p?.stockTrackingEnabled ? p.currentStock : null;
      const suggest = Math.max(0, Math.ceil(r.week * 1.2) - (stock ?? 0));
      return { ...r, stock, suggest, trend: r.week - r.prev };
    });
  }, [items, sales, products]);

  const debt = useMemo(() => {
    const injected = injections.reduce((s, i) => s + Number(i.amount), 0);
    const repaid = injRepayments.reduce((s, r) => s + Number(r.amount), 0);
    return { injected, repaid, outstanding: Math.max(0, injected - repaid) };
  }, [injections, injRepayments]);

  const exportCsv = () => {
    const header = 'Receipt,Type,Date,Payment,Cashier,VAT,Total\n';
    const body = filtered
      .map(s => [
        s.receipt_number,
        s.doc_type,
        new Date(s.created_at).toISOString(),
        s.payment_method,
        s.cashier_name ?? '',
        Number(s.vat_amount).toFixed(2),
        Number(s.total).toFixed(2),
      ].join(','))
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maita-cakes-sales-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Sales performance, product split and bills</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => load()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ranges.map(r => (
          <Button key={r.key} size="sm" variant={range === r.key ? 'default' : 'outline'} onClick={() => setRange(r.key)}>
            {r.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue" value={`$${totals.revenue.toFixed(2)}`} highlight />
            <Stat label="Transactions" value={String(totals.count)} />
            <Stat label="Average sale" value={`$${totals.avg.toFixed(2)}`} />
            <Stat label="Bills paid" value={`$${periodExpenses.toFixed(2)}`} />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fast-moving products (last 7 days) & restock advice</h2>
            {fastMovers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No sales in the last 7 days.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="data-table min-w-[560px]">
                  <thead><tr><th>Product</th><th className="text-right">Sold this week</th><th className="text-right">vs last week</th><th className="text-right">In stock</th><th>Advice</th></tr></thead>
                  <tbody>
                    {fastMovers.map(r => (
                      <tr key={r.name}>
                        <td className="font-medium">{r.name}</td>
                        <td className="text-right tabular-nums">{r.week}</td>
                        <td className="text-right tabular-nums">{r.trend > 0 ? `+${r.trend}` : r.trend}</td>
                        <td className="text-right tabular-nums">{r.stock ?? '—'}</td>
                        <td className="text-sm">{r.suggest > 0 ? <span className="font-semibold text-primary">Add {r.suggest} to stock</span> : 'Stock is enough for next week'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Money injections (debt, not profit)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Injected into business', value: debt.injected },
                { label: 'Repaid', value: debt.repaid },
                { label: 'Still owing', value: debt.outstanding },
              ].map(card => (
                <div key={card.label} className="rounded-lg border p-3">
                  <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">${card.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Injected money is excluded from revenue and profit; it is a debt the business must return.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 xl:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cakes vs accessories</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Cakes (per order)', value: split.cake.revenue, sub: `${split.cake.qty} units sold`, accent: true },
                  { label: 'Accessories (in shop)', value: split.accessory.revenue, sub: `${split.accessory.qty} units sold`, accent: false },
                  { label: 'Combined revenue', value: split.cake.revenue + split.accessory.revenue, sub: `Net after bills: $${(totals.revenue - periodExpenses).toFixed(2)}`, accent: false },
                ].map(card => (
                  <div key={card.label} className="flex h-full flex-col justify-between rounded-lg border p-3">
                    <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                    <p className={`mt-1 text-xl font-bold tabular-nums ${card.accent ? 'text-primary' : ''}`}>${card.value.toFixed(2)}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{card.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue by payment method</h2>
              {Object.keys(totals.byPayment).length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No sales in this period.</p>
              ) : (
                <div className="mt-3 divide-y">
                  {Object.entries(totals.byPayment).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate capitalize">{method.replace('_', ' ')}</span>
                      <span className="shrink-0 font-semibold tabular-nums">${amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th className="w-[22%]">Receipt</th>
                    <th className="w-[12%]">Type</th>
                    <th className="w-[28%]">Date</th>
                    <th className="w-[18%]">Payment</th>
                    <th className="w-[20%] text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No sales in this period.</td></tr>
                  ) : filtered.map(s => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.receipt_number}</td>
                      <td className="capitalize">{s.doc_type}</td>
                      <td className="whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="capitalize">{s.payment_method.replace('_', ' ')}</td>
                      <td className="text-right font-semibold tabular-nums">${Number(s.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}
