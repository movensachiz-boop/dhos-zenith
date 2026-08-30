import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Printer, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCachedState, isOffline } from '@/lib/cache';
import { logAudit } from '@/lib/db';
import { printReceiptHtml } from '@/lib/receiptPrint';
import { BillReceipt, BillReceiptData } from '@/components/bills/BillReceipt';

type Expense = {
  id: string;
  title: string;
  category: string;
  vendor: string | null;
  amount: number;
  payment_method: string;
  paid_on: string;
  receipt_number: string;
  notes: string | null;
  created_at: string;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const billNo = () => `BILL-${Date.now().toString().slice(-6)}`;

const emptyForm = {
  title: '',
  category: 'Operations',
  vendor: '',
  amount: '',
  payment_method: 'cash',
  paid_on: today(),
  notes: '',
};

export default function Bills() {
  const [rows, setRows, hadCache] = useCachedState<Expense[]>('mc_expenses_cache', []);
  const [loading, setLoading] = useState(!hadCache);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<BillReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (isOffline()) { setLoading(false); return; }
    const { data, error } = await supabase.from('expenses').select('*').order('paid_on', { ascending: false });
    if (error) {
      if (!hadCache) toast({ title: 'Failed to load bills', description: error.message, variant: 'destructive' });
    } else setRows((data ?? []) as unknown as Expense[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      all: rows.reduce((s, r) => s + Number(r.amount), 0),
      month: rows.filter(r => r.paid_on.startsWith(month)).reduce((s, r) => s + Number(r.amount), 0),
      count: rows.length,
    };
  }, [rows]);

  const toReceipt = (r: Expense): BillReceiptData => ({
    receiptNumber: r.receipt_number,
    date: new Date(r.created_at),
    title: r.title,
    category: r.category,
    vendor: r.vendor ?? undefined,
    amount: Number(r.amount),
    paymentMethod: r.payment_method,
    paidOn: new Date(r.paid_on).toLocaleDateString(),
    notes: r.notes ?? undefined,
  });

  const save = async () => {
    if (!form.title.trim()) return toast({ title: 'Bill title is required', variant: 'destructive' });
    if (!(Number(form.amount) > 0)) return toast({ title: 'Enter the amount paid', variant: 'destructive' });
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || 'General',
      vendor: form.vendor.trim() || null,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      paid_on: form.paid_on || today(),
      receipt_number: billNo(),
      notes: form.notes.trim() || null,
      created_by: auth.user?.id ?? null,
    };
    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    setSaving(false);
    if (error) return toast({ title: 'Could not save bill', description: error.message, variant: 'destructive' });
    await logAudit('create', 'expenses', (data as { id: string }).id, { title: payload.title, amount: payload.amount });
    toast({ title: 'Bill recorded' });
    setForm(emptyForm);
    setOpen(false);
    setReceipt(toReceipt(data as unknown as Expense));
    load();
  };

  const remove = async (r: Expense) => {
    const { error } = await supabase.from('expenses').delete().eq('id', r.id);
    if (error) return toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    await logAudit('delete', 'expenses', r.id, { title: r.title });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bills &amp; Expenses</h1>
          <p className="text-muted-foreground">Record every bill paid and print a branded receipt.</p>
        </div>
        <Button variant="pos" onClick={() => setOpen(true)}><Plus className="mr-2 h-5 w-5" /> Record bill</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Paid this month', value: money(totals.month) },
          { label: 'Total recorded', value: money(totals.all) },
          { label: 'Bills', value: String(totals.count) },
        ].map(c => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No bills recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr><th>Receipt</th><th>Bill</th><th>Category</th><th>Paid to</th><th>Paid on</th><th>Method</th><th className="text-right">Amount</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.receipt_number}</td>
                    <td className="font-medium">{r.title}</td>
                    <td>{r.category}</td>
                    <td>{r.vendor ?? '-'}</td>
                    <td>{new Date(r.paid_on).toLocaleDateString()}</td>
                    <td className="capitalize">{r.payment_method.replace(/_/g, ' ')}</td>
                    <td className="text-right font-semibold">{money(Number(r.amount))}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setReceipt(toReceipt(r))}><Printer className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record a bill payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Bill title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Electricity - August" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Paid to (vendor)</Label>
                <Input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Input value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Paid on</Label>
                <Input type="date" value={form.paid_on} onChange={e => setForm({ ...form, paid_on: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="pos" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />} Save &amp; issue receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={o => !o && setReceipt(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Bill receipt</DialogTitle></DialogHeader>
          {receipt && <BillReceipt ref={receiptRef} data={receipt} />}
          <DialogFooter>
            <Button variant="pos" onClick={() => receiptRef.current && printReceiptHtml(receiptRef.current.innerHTML)}>
              <Printer className="mr-2 h-4 w-4" /> Print receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
