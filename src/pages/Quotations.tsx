import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { useCachedLogo } from '@/lib/offline';
import { fetchProducts } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { STORE_INFO } from '@/components/pos/ThermalReceipt';
import { A4DocInput, A4Line, downloadA4Pdf } from '@/lib/a4Doc';
import { countdownTo, useNow } from '@/lib/countdown';

type Line = A4Line & { id: string };

type SavedDoc = {
  id: string;
  doc_number: string;
  doc_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_number: string | null;
  customer_address: string | null;
  lines: A4Line[];
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string | null;
  valid_until: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

const newLine = (): Line => ({ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 });
const docNo = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}`;
const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

export default function Quotations() {
  const logoSrc = useCachedLogo(logoAsset.url);
  const now = useNow();
  const [products, setProducts] = useState<Product[]>([]);
  const [saved, setSaved] = useState<SavedDoc[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('Quotation valid for 14 days. 50% upfront payment required to confirm an order.');
  const [validDays, setValidDays] = useState(14);

  const [deposit, setDeposit] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [collectionDate, setCollectionDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);


  const loadSaved = useCallback(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) toast({ title: 'Could not load saved documents', description: error.message, variant: 'destructive' });
    setSaved((data ?? []) as unknown as SavedDoc[]);
    setLoadingSaved(false);
  }, []);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
    loadSaved();
  }, [loadSaved]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0),
    [lines]
  );
  const total = Math.max(0, subtotal - Number(discount || 0));
  const balance = Math.max(0, total - Number(deposit || 0));

  const update = (id: string, patch: Partial<Line>) =>
    setLines(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const pickProduct = (id: string, name: string) => {
    const p = products.find(pr => pr.name.toLowerCase() === name.toLowerCase());
    if (p) update(id, { description: p.name, unitPrice: p.sellingPrice });
    else update(id, { description: name });
  };

  const validLines = lines.filter(l => l.description.trim() && Number(l.quantity) > 0);

  const generate = async (kind: 'quote' | 'upfront') => {
    if (validLines.length === 0) {
      toast({ title: 'Add at least one item', variant: 'destructive' });
      return;
    }
    if (kind === 'upfront' && Number(deposit) <= 0) {
      toast({ title: 'Enter the upfront amount paid', variant: 'destructive' });
      return;
    }
    const nowDate = new Date();
    const number = editingNumber ?? docNo(kind === 'quote' ? 'QT' : 'UP');

    const validUntil =
      kind === 'quote' ? new Date(nowDate.getTime() + Number(validDays || 0) * 86400000) : undefined;
    const docLines = validLines.map(({ description, quantity, unitPrice }) => ({
      description,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
    }));
    const documentData: A4DocInput = {
      docTitle: kind === 'quote' ? 'QUOTATION' : 'UPFRONT PAYMENT',
      docNumber: number,
      date: nowDate,
      validUntil,
      customerName,
      customerPhone,
      customerNumber,
      customerAddress,
      lines: docLines,
      subtotal,
      discount: Number(discount) || undefined,
      total,
      amountPaid: kind === 'upfront' ? Number(deposit) : undefined,
      balanceDue: kind === 'upfront' ? balance : undefined,
      paymentMethod: kind === 'upfront' ? paymentMethod : undefined,
      notes:
        kind === 'upfront'
          ? [collectionDate ? `Collection / delivery date: ${collectionDate}` : '', notes]
              .filter(Boolean)
              .join('\n')
          : notes,
      logoSrc,
      store: STORE_INFO,
    };

    const { data: auth } = await supabase.auth.getUser();

    // Save the document so it can always be re-downloaded later.
    try {
      const { error } = await supabase.from('quotations').insert({
        doc_number: number,
        doc_type: kind,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_number: customerNumber || null,
        customer_address: customerAddress || null,
        lines: docLines as never,
        subtotal,
        discount: Number(discount) || 0,
        total,
        amount_paid: kind === 'upfront' ? Number(deposit) || 0 : 0,
        balance_due: kind === 'upfront' ? balance : 0,
        payment_method: kind === 'upfront' ? paymentMethod : null,
        valid_until: validUntil ? validUntil.toISOString().slice(0, 10) : null,
        due_date: collectionDate || null,
        notes: notes || null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
      loadSaved();
    } catch (e) {
      toast({
        title: 'Document not saved',
        description: `The PDF will still download: ${(e as Error).message}`,
        variant: 'destructive',
      });
    }

    if (kind === 'upfront') {
      try {
        const { error } = await supabase.from('sales').insert({
          receipt_number: number,
          doc_type: 'upfront',
          subtotal,
          vat_amount: 0,
          discount: Number(discount) || 0,
          total,
          amount_paid: Number(deposit) || 0,
          balance_due: balance,
          payment_method: paymentMethod.toLowerCase().replace(/\s+/g, '_'),
          status: balance > 0 ? 'partial' : 'completed',
          client_name: customerName || null,
          client_phone: customerPhone || null,
          customer_number: customerNumber || null,
          notes: notes || null,
          due_date: collectionDate || null,
          cashier_id: auth.user?.id ?? null,
          cashier_name: auth.user?.email ?? null,
        });
        if (error) throw error;
        toast({ title: 'Upfront payment recorded' });
      } catch (e) {
        toast({
          title: 'Saved offline only',
          description: `Could not record the payment: ${(e as Error).message}`,
          variant: 'destructive',
        });
      }
    }

    try {
      await downloadA4Pdf(documentData, `${kind === 'quote' ? 'Quotation' : 'Upfront-Payment'}-${number}`);
      toast({ title: 'PDF downloaded' });
    } catch (e) {
      toast({ title: 'Could not generate PDF', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const redownload = async (doc: SavedDoc) => {
    const isUpfront = doc.doc_type === 'upfront';
    const input: A4DocInput = {
      docTitle: isUpfront ? 'UPFRONT PAYMENT' : 'QUOTATION',
      docNumber: doc.doc_number,
      date: new Date(doc.created_at),
      validUntil: doc.valid_until ? new Date(doc.valid_until) : undefined,
      customerName: doc.customer_name ?? undefined,
      customerPhone: doc.customer_phone ?? undefined,
      customerNumber: doc.customer_number ?? undefined,
      customerAddress: doc.customer_address ?? undefined,
      lines: (doc.lines ?? []).map(l => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
      subtotal: Number(doc.subtotal),
      discount: Number(doc.discount) || undefined,
      total: Number(doc.total),
      amountPaid: isUpfront ? Number(doc.amount_paid) : undefined,
      balanceDue: isUpfront ? Number(doc.balance_due) : undefined,
      paymentMethod: doc.payment_method ?? undefined,
      notes: [doc.due_date ? `Collection / delivery date: ${doc.due_date}` : '', doc.notes ?? '']
        .filter(Boolean)
        .join('\n'),
      logoSrc,
      store: STORE_INFO,
    };
    try {
      await downloadA4Pdf(input, `${isUpfront ? 'Upfront-Payment' : 'Quotation'}-${doc.doc_number}`);
      toast({ title: 'PDF downloaded' });
    } catch (e) {
      toast({ title: 'Could not generate PDF', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const remove = async (doc: SavedDoc) => {
    const { error } = await supabase.from('quotations').delete().eq('id', doc.id);
    if (error) return toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    loadSaved();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Quotations &amp; Upfront Payments</h1>
        <p className="text-muted-foreground">Generate branded A4 PDFs for clients — every document is saved and can be re-downloaded</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Customer details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="07..." />
            </div>
            <div className="space-y-1.5">
              <Label>Customer No (optional)</Label>
              <Input value={customerNumber} onChange={e => setCustomerNumber(e.target.value)} placeholder="MC12345" />
            </div>
            <div className="space-y-1.5">
              <Label>Address (optional)</Label>
              <Input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Items</h3>
            <Button size="sm" variant="outline" onClick={() => setLines(ls => [...ls, newLine()])}>
              <Plus className="h-4 w-4 mr-1" /> Add item
            </Button>
          </div>
          <datalist id="product-options">
            {products.map(p => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <div className="space-y-3">
            {lines.map(l => (
              <div key={l.id} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-6"
                  list="product-options"
                  placeholder="Product / description"
                  value={l.description}
                  onChange={e => pickProduct(l.id, e.target.value)}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={e => update(l.id, { quantity: Number(e.target.value) })}
                />
                <Input
                  className="col-span-3"
                  type="number"
                  step="0.01"
                  value={l.unitPrice}
                  onChange={e => update(l.id, { unitPrice: Number(e.target.value) })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1 text-destructive"
                  onClick={() => setLines(ls => (ls.length > 1 ? ls.filter(x => x.id !== l.id) : ls))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="quote">
        <TabsList>
          <TabsTrigger value="quote">Quotation</TabsTrigger>
          <TabsTrigger value="upfront">Upfront payment</TabsTrigger>
        </TabsList>

        <TabsContent value="quote" className="rounded-xl border bg-card p-6 space-y-4 mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Valid for (days)</Label>
              <Input type="number" value={validDays} onChange={e => setValidDays(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes / terms</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <Button variant="pos" onClick={() => generate('quote')}>
            <FileDown className="h-4 w-4 mr-2" /> Generate quotation PDF
          </Button>
        </TabsContent>

        <TabsContent value="upfront" className="rounded-xl border bg-card p-6 space-y-4 mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Amount paid upfront</Label>
              <Input type="number" step="0.01" value={deposit} onChange={e => setDeposit(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Collection / delivery date</Label>
              <Input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <span>Total: <strong>${total.toFixed(2)}</strong></span>
            <span>Paid: <strong>${Number(deposit || 0).toFixed(2)}</strong></span>
            <span className="text-primary">Balance due: <strong>${balance.toFixed(2)}</strong></span>
          </div>
          <div className="space-y-1.5">
            <Label>Notes / terms</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <Button variant="pos" onClick={() => generate('upfront')}>
            <FileDown className="h-4 w-4 mr-2" /> Generate upfront payment PDF
          </Button>
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Saved documents</h2>
          <p className="text-sm text-muted-foreground">Every quotation and upfront payment ever generated — re-download any of them as a PDF.</p>
        </div>
        {loadingSaved ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : saved.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">No documents generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr><th>Document</th><th>Type</th><th>Customer</th><th>Date</th><th className="text-right">Total</th><th className="text-right">Balance</th><th>Deadline</th><th></th></tr>
              </thead>
              <tbody>
                {saved.map(d => {
                  const cd = d.doc_type === 'upfront' ? countdownTo(d.due_date, now) : countdownTo(d.valid_until, now);
                  return (
                    <tr key={d.id}>
                      <td className="font-mono text-xs">{d.doc_number}</td>
                      <td className="capitalize">{d.doc_type === 'upfront' ? 'Upfront payment' : 'Quotation'}</td>
                      <td>{d.customer_name ?? '-'}</td>
                      <td>{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="text-right font-semibold">{money(Number(d.total))}</td>
                      <td className="text-right">{Number(d.balance_due) > 0 ? money(Number(d.balance_due)) : '-'}</td>
                      <td className={cd?.overdue ? 'text-destructive font-semibold' : ''}>{cd ? cd.label : '-'}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => redownload(d)}>
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
