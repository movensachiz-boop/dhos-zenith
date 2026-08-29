import { useEffect, useMemo, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts } from '@/lib/db';
import { Product } from '@/types';

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<{ amount: number; paid_on: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');

  useEffect(() => {
    (async () => {
      const [salesRes, itemsRes, expensesRes, productList] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*'),
        supabase.from('expenses').select('amount, paid_on'),
        fetchProducts().catch(() => [] as Product[]),
      ]);
      if (salesRes.error) toast({ title: 'Failed to load report data', description: salesRes.error.message, variant: 'destructive' });
      else setSales((salesRes.data ?? []) as unknown as Sale[]);
      setItems((itemsRes.data ?? []) as unknown as SaleItem[]);
      setExpenses((expensesRes.data ?? []) as { amount: number; paid_on: string }[]);
      setProducts(productList);
      setLoading(false);
    })();
  }, []);

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Sales performance and VAT summary</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ranges.map(r => (
          <Button key={r.key} size="sm" variant={range === r.key ? 'default' : 'outline'} onClick={() => setRange(r.key)}>
            {r.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Revenue" value={`$${totals.revenue.toFixed(2)}`} />
            <Stat label="Transactions" value={String(totals.count)} />
            <Stat label="Average sale" value={`$${totals.avg.toFixed(2)}`} />
            <Stat label="Bills paid" value={`$${periodExpenses.toFixed(2)}`} />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">Cakes vs accessories</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Cakes (per order)</p>
                <p className="text-xl font-bold text-primary">${split.cake.revenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{split.cake.qty} units sold</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Accessories (in shop)</p>
                <p className="text-xl font-bold">${split.accessory.revenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{split.accessory.qty} units sold</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Combined &amp; net of bills</p>
                <p className="text-xl font-bold">${(split.cake.revenue + split.accessory.revenue).toFixed(2)}</p>
                <p className={`text-xs font-semibold ${totals.revenue - periodExpenses >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  Net after bills: ${(totals.revenue - periodExpenses).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">Revenue by payment method</h2>
            {Object.keys(totals.byPayment).length === 0 ? (
              <p className="text-muted-foreground text-sm">No sales in this period.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(totals.byPayment).map(([method, amount]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="capitalize">{method.replace('_', ' ')}</span>
                    <span className="font-semibold">${amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Receipt</th><th>Type</th><th>Date</th><th>Payment</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="font-mono text-sm">{s.receipt_number}</td>
                    <td className="capitalize">{s.doc_type}</td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td className="capitalize">{s.payment_method.replace('_', ' ')}</td>
                    <td className="text-right font-semibold">${Number(s.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}
