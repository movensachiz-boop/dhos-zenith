import { useEffect, useMemo, useState } from 'react';
import { FileDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { useCachedLogo } from '@/lib/offline';
import { fetchProducts } from '@/lib/db';
import { Product } from '@/types';
import { STORE_INFO } from '@/components/pos/ThermalReceipt';
import { A4DocInput, A4Line, downloadA4Pdf } from '@/lib/a4Doc';

type Line = A4Line & { id: string };

const newLine = (): Line => ({ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 });
const docNo = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}`;

export default function Quotations() {
  const logoSrc = useCachedLogo(logoAsset.url);
  const [products, setProducts] = useState<Product[]>([]);

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

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

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
    const now = new Date();
    const number = docNo(kind === 'quote' ? 'QT' : 'UP');
    const documentData: A4DocInput = {
      docTitle: kind === 'quote' ? 'QUOTATION' : 'UPFRONT PAYMENT',
      docNumber: number,
      date: now,
      validUntil:
        kind === 'quote' ? new Date(now.getTime() + Number(validDays || 0) * 86400000) : undefined,
      customerName,
      customerPhone,
      customerNumber,
      customerAddress,
      lines: validLines.map(({ description, quantity, unitPrice }) => ({
        description,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      })),
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
    if (kind === 'upfront') {
      try {
        const { data: auth } = await supabase.auth.getUser();
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Quotations &amp; Upfront Payments</h1>
        <p className="text-muted-foreground">Generate branded A4 PDFs for clients</p>
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
    </div>
  );
}
