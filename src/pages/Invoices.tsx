import { useEffect, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThermalReceipt } from '@/components/pos/ThermalReceipt';
import { CartItem, PaymentMethod, Product } from '@/types';
import { useRef } from 'react';

type Sale = {
  id: string;
  receipt_number: string;
  doc_type: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  payment_method: string;
  status: string;
  client_name: string | null;
  cashier_name: string | null;
  created_at: string;
};

export default function Invoices() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<null | { sale: Sale; items: CartItem[] }>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load invoices', description: error.message, variant: 'destructive' });
    else setSales((data ?? []) as unknown as Sale[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openSale = async (sale: Sale) => {
    const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
    if (error) {
      toast({ title: 'Could not load items', description: error.message, variant: 'destructive' });
      return;
    }
    const items: CartItem[] = (data ?? []).map(row => ({
      product: {
        id: row.id,
        name: row.product_name,
        sku: row.sku ?? '',
        category: '',
        costPrice: 0,
        sellingPrice: Number(row.unit_price),
        vatApplicable: row.vat_applicable,
        unitOfMeasure: 'pcs',
        stockTrackingEnabled: false,
        currentStock: 0,
        lowStockThreshold: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product,
      quantity: Number(row.quantity),
      discount: 0,
      lineTotal: Number(row.line_total),
    }));
    setPreview({ sale, items });
  };

  const voidSale = async (sale: Sale) => {
    const { error } = await supabase.from('sales').update({ status: 'voided' }).eq('id', sale.id);
    if (error) {
      toast({ title: 'Could not void', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${sale.receipt_number} voided` });
    load();
  };

  const print = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=380,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Receipt</title><style>
      body{font-family:ui-monospace,monospace;font-size:11px;margin:0;padding:8px;width:80mm;color:#000;background:#fff}
      img{max-width:96px;display:block;margin:0 auto}
      .flex{display:flex}.justify-between{justify-content:space-between}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const filtered = sales.filter(s =>
    `${s.receipt_number} ${s.client_name ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Invoices &amp; Receipts</h1>
        <p className="text-muted-foreground">Every recorded sale and order</p>
      </div>

      <Input
        placeholder="Search receipt number or customer..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No sales recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th><th>Type</th><th>Date</th><th>Customer</th><th>Payment</th>
                <th className="text-right">Total</th><th>Status</th><th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-sm">{s.receipt_number}</td>
                  <td className="capitalize">{s.doc_type}</td>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td>{s.client_name ?? '—'}</td>
                  <td className="capitalize">{s.payment_method.replace('_', ' ')}</td>
                  <td className="text-right font-bold text-primary">${Number(s.total).toFixed(2)}</td>
                  <td className={s.status === 'voided' ? 'text-destructive' : 'text-success'}>{s.status}</td>
                  <td className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openSale(s)}>View</Button>
                    {s.status !== 'voided' && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => voidSale(s)}>Void</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{preview?.sale.receipt_number}</DialogTitle></DialogHeader>
          {preview && (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
              <ThermalReceipt
                ref={receiptRef}
                items={preview.items}
                subtotal={Number(preview.sale.subtotal)}
                discount={Number((preview.sale as unknown as { discount?: number }).discount ?? 0)}

                total={Number(preview.sale.total)}
                paymentMethod={preview.sale.payment_method as PaymentMethod}
                receiptNumber={preview.sale.receipt_number}
                date={new Date(preview.sale.created_at)}
                docType={preview.sale.doc_type === 'order' ? 'order' : 'sale'}
                customerName={preview.sale.client_name ?? undefined}
                customerNumber={(preview.sale as unknown as { customer_number?: string }).customer_number ?? undefined}
                customerPhone={(preview.sale as unknown as { client_phone?: string }).client_phone ?? undefined}

              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            <Button onClick={print}><Printer className="h-4 w-4 mr-2" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
