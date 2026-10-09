import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, Upload, Loader2, Trash2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts, logAudit } from '@/lib/db';
import { branchName } from '@/lib/branch';
import { Product } from '@/types';

type Line = { product_id: string | null; product: string; quantity: number; unit_price: number };

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(f);
  img.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = img.width * scale; c.height = img.height * scale;
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    res(c.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = rej;
  img.src = url;
});

export default function ScanSales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts().then(setProducts).catch(() => {}); }, []);

  const match = (name: string) => {
    const n = name.toLowerCase().trim();
    return products.find(p => p.name.toLowerCase() === n)
      ?? products.find(p => p.name.toLowerCase().includes(n) || n.includes(p.name.toLowerCase()));
  };

  const downloadForm = async () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    try {
      const logo = localStorage.getItem('mc_logo_data_url');
      if (logo) pdf.addImage(logo, 'PNG', 15, 10, 22, 22);
    } catch { /* ignore */ }
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(`${branchName()} - Daily Sales Sheet`, 42, 20);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.text('Date: ____ / ____ / ________      Shop: ____________________      Recorded by: ________________', 15, 40);
    let y = 50;
    const head = () => {
      pdf.setFont('helvetica', 'bold'); pdf.setFillColor(235, 235, 235);
      pdf.rect(15, y, 180, 8, 'F');
      pdf.text('Product', 17, y + 5.5); pdf.text('Price', 120, y + 5.5); pdf.text('Qty sold', 150, y + 5.5);
      pdf.setFont('helvetica', 'normal'); y += 8;
    };
    head();
    const rows = [...products.map(p => ({ n: p.name, p: `$${p.sellingPrice.toFixed(2)}` })), ...Array(8).fill({ n: '', p: '' })];
    rows.forEach(r => {
      if (y > 280) { pdf.addPage(); y = 15; head(); }
      pdf.rect(15, y, 180, 9);
      pdf.line(115, y, 115, y + 9); pdf.line(145, y, 145, y + 9);
      pdf.text(r.n.slice(0, 50), 17, y + 6); pdf.text(r.p, 120, y + 6);
      y += 9;
    });
    pdf.setFontSize(8);
    pdf.text('Write numbers clearly in the Qty box. Leave empty if not sold. Take a flat, well-lit photo to scan.', 15, Math.min(y + 8, 290));
    pdf.save(`Sales-Sheet-${branchName().replace(/\s/g, '-')}.pdf`);
  };

  const scan = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      const { data, error } = await supabase.functions.invoke('scan-sales', { body: { images, products: products.map(p => p.name) } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data.date) setDate(data.date);
      const found: Line[] = (data.lines ?? []).filter((l: { quantity: number }) => l.quantity > 0).map((l: { product: string; quantity: number; unit_price: number | null }) => {
        const p = match(l.product);
        return { product_id: p?.id ?? null, product: p?.name ?? l.product, quantity: l.quantity, unit_price: p?.sellingPrice ?? l.unit_price ?? 0 };
      });
      setLines(prev => [...prev, ...found]);
      toast({ title: `Found ${found.length} item(s)`, description: 'Check the list, then save.' });
    } catch (e) {
      toast({ title: 'Scan failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const update = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l));

  const save = async () => {
    const valid = lines.filter(l => l.quantity > 0 && l.product.trim());
    if (!valid.length) return;
    setSaving(true);
    try {
      const total = valid.reduce((s, l) => s + l.quantity * l.unit_price, 0);
      const { data: auth } = await supabase.auth.getUser();
      const receipt = `SC-${Date.now().toString().slice(-6)}`;
      const { data: sale, error } = await supabase.from('sales').insert({
        receipt_number: receipt, doc_type: 'sale', subtotal: total, vat_amount: 0, discount: 0, total,
        amount_paid: total, balance_due: 0, payment_method: 'cash', currency: 'USD', status: 'completed',
        client_name: 'Scanned sales sheet', notes: `Scanned sheet for ${date}`,
        created_at: new Date(`${date}T12:00:00`).toISOString(),
        cashier_id: auth.user?.id ?? null, cashier_name: auth.user?.email ?? null,
      } as never).select().single();
      if (error) throw error;
      const { error: e2 } = await supabase.from('sale_items').insert(valid.map(l => ({
        sale_id: (sale as { id: string }).id, product_id: l.product_id, product_name: l.product,
        sku: products.find(p => p.id === l.product_id)?.sku ?? null, quantity: l.quantity,
        unit_price: l.unit_price, vat_applicable: false, line_total: l.quantity * l.unit_price,
      })) as never);
      if (e2) throw e2;
      await logAudit('scan_import', 'sales', (sale as { id: string }).id, { items: valid.length, total });
      toast({ title: 'Sales saved', description: `${receipt} · $${total.toFixed(2)}` });
      setLines([]); setFiles([]);
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Scan Sales Sheets</h1>
        <p className="text-sm text-muted-foreground">Print the sheet, fill it in at the shop, then upload a photo to enter all sales automatically.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">1. Print the sales sheet</h2>
          <p className="text-sm text-muted-foreground">Lists all your products with a box for quantity sold.</p>
          <Button onClick={downloadForm}><FileDown className="h-4 w-4 mr-2" /> Download sheet (PDF)</Button>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">2. Upload photos of filled sheets</h2>
          <Input type="file" accept="image/*" multiple capture="environment" onChange={e => setFiles(Array.from(e.target.files ?? []))} />
          <Button onClick={scan} disabled={!files.length || busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {busy ? 'Reading…' : `Scan ${files.length || ''} photo(s)`}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">3. Check and save</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sales date</span>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-auto" />
          </div>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No items yet. Scan a photo or add a line.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[560px]">
              <thead><tr><th>Product</th><th className="w-24">Qty</th><th className="w-28">Price</th><th className="w-24 text-right">Total</th><th className="w-10" /></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <select className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" value={l.product_id ?? ''}
                        onChange={e => { const p = products.find(x => x.id === e.target.value); update(i, p ? { product_id: p.id, product: p.name, unit_price: p.sellingPrice } : { product_id: null }); }}>
                        <option value="">{l.product_id ? '—' : `${l.product} (not in products)`}</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td><Input type="number" value={l.quantity} onChange={e => update(i, { quantity: Number(e.target.value) })} /></td>
                    <td><Input type="number" step="0.01" value={l.unit_price} onChange={e => update(i, { unit_price: Number(e.target.value) })} /></td>
                    <td className="text-right tabular-nums">${(l.quantity * l.unit_price).toFixed(2)}</td>
                    <td><Button size="icon" variant="ghost" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => setLines(ls => [...ls, { product_id: null, product: '', quantity: 1, unit_price: 0 }])}>
            <Plus className="h-4 w-4 mr-2" /> Add line
          </Button>
          <div className="flex items-center gap-3">
            <span className="font-semibold tabular-nums">Total: ${total.toFixed(2)}</span>
            <Button onClick={save} disabled={!lines.length || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
