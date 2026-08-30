import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Download, HandCoins, Loader2, Plus, Printer, Trash2 } from 'lucide-react';
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
import { downloadReceiptPdf } from '@/lib/receiptPdf';
import { InjectionReceipt, InjectionReceiptData } from '@/components/injections/InjectionReceipt';

type Injection = {
  id: string;
  source: string;
  amount: number;
  currency: string;
  received_on: string;
  due_date: string | null;
  reference: string;
  notes: string | null;
  created_at: string;
};

type Repayment = {
  id: string;
  injection_id: string;
  amount: number;
  payment_method: string;
  paid_on: string;
  receipt_number: string;
  notes: string | null;
  created_at: string;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const injNo = () => `INJ-${Date.now().toString().slice(-6)}`;
const repNo = () => `REP-${Date.now().toString().slice(-6)}`;

const emptyInjection = { source: '', amount: '', received_on: today(), due_date: '', notes: '' };
const emptyRepayment = { amount: '', payment_method: 'cash', paid_on: today(), notes: '' };

export default function Injections() {
  const [injections, setInjections, hadInj] = useCachedState<Injection[]>('mc_injections_cache', []);
  const [repayments, setRepayments] = useCachedState<Repayment[]>('mc_injection_repayments_cache', []);
  const [loading, setLoading] = useState(!hadInj);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyInjection);
  const [payTarget, setPayTarget] = useState<Injection | null>(null);
  const [payForm, setPayForm] = useState(emptyRepayment);
  const [receipt, setReceipt] = useState<InjectionReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (isOffline()) { setLoading(false); return; }
    const [inj, rep] = await Promise.all([
      supabase.from('injections').select('*').order('received_on', { ascending: false }),
      supabase.from('injection_repayments').select('*').order('paid_on', { ascending: false }),
    ]);
    if (inj.error) {
      if (!hadInj) toast({ title: 'Failed to load injections', description: inj.error.message, variant: 'destructive' });
    } else {
      setInjections((inj.data ?? []) as unknown as Injection[]);
      setRepayments((rep.data ?? []) as unknown as Repayment[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const paidByInjection = useMemo(() => {
    const map = new Map<string, number>();
    repayments.forEach(r => map.set(r.injection_id, (map.get(r.injection_id) ?? 0) + Number(r.amount)));
    return map;
  }, [repayments]);

  const totals = useMemo(() => {
    const debt = injections.reduce((s, i) => s + Number(i.amount), 0);
    const repaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
    return { debt, repaid, outstanding: Math.max(0, debt - repaid), count: injections.length };
  }, [injections, repayments]);

  const saveInjection = async () => {
    if (!form.source.trim()) return toast({ title: 'Who gave the money?', variant: 'destructive' });
    if (!(Number(form.amount) > 0)) return toast({ title: 'Enter the amount injected', variant: 'destructive' });
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      source: form.source.trim(),
      amount: Number(form.amount),
      currency: 'USD',
      received_on: form.received_on || today(),
      due_date: form.due_date || null,
      reference: injNo(),
      notes: form.notes.trim() || null,
      created_by: auth.user?.id ?? null,
    };
    const { data, error } = await supabase.from('injections').insert(payload).select().single();
    setSaving(false);
    if (error) return toast({ title: 'Could not save injection', description: error.message, variant: 'destructive' });
    const row = data as unknown as Injection;
    await logAudit('create', 'injections', row.id, { source: payload.source, amount: payload.amount });
    toast({ title: 'Money injection recorded as debt' });
    setForm(emptyInjection);
    setOpen(false);
    setReceipt({
      kind: 'injection',
      receiptNumber: row.reference,
      date: new Date(row.created_at),
      source: row.source,
      amount: Number(row.amount),
      paidOn: new Date(row.received_on).toLocaleDateString(),
      totalDebt: Number(row.amount),
      totalRepaid: 0,
      outstanding: Number(row.amount),
      notes: row.notes ?? undefined,
    });
    load();
  };

  const saveRepayment = async () => {
    if (!payTarget) return;
    const amount = Number(payForm.amount);
    if (!(amount > 0)) return toast({ title: 'Enter the amount repaid', variant: 'destructive' });
    const alreadyPaid = paidByInjection.get(payTarget.id) ?? 0;
    const owing = Number(payTarget.amount) - alreadyPaid;
    if (amount - owing > 0.009) return toast({ title: 'Amount exceeds the balance owing', description: `Balance owing is ${money(owing)}`, variant: 'destructive' });
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      injection_id: payTarget.id,
      amount,
      payment_method: payForm.payment_method,
      paid_on: payForm.paid_on || today(),
      receipt_number: repNo(),
      notes: payForm.notes.trim() || null,
      created_by: auth.user?.id ?? null,
    };
    const { data, error } = await supabase.from('injection_repayments').insert(payload).select().single();
    setSaving(false);
    if (error) return toast({ title: 'Could not record repayment', description: error.message, variant: 'destructive' });
    const row = data as unknown as Repayment;
    await logAudit('create', 'injection_repayments', row.id, { injection: payTarget.reference, amount });
    const repaid = alreadyPaid + amount;
    toast({ title: repaid >= Number(payTarget.amount) - 0.009 ? 'Debt fully paid' : 'Repayment recorded' });
    setReceipt({
      kind: 'repayment',
      receiptNumber: row.receipt_number,
      date: new Date(row.created_at),
      source: payTarget.source,
      amount,
      paymentMethod: row.payment_method,
      paidOn: new Date(row.paid_on).toLocaleDateString(),
      totalDebt: Number(payTarget.amount),
      totalRepaid: repaid,
      outstanding: Math.max(0, Number(payTarget.amount) - repaid),
      notes: row.notes ?? undefined,
    });
    setPayTarget(null);
    setPayForm(emptyRepayment);
    load();
  };

  const removeInjection = async (i: Injection) => {
    if (!window.confirm(`Delete injection ${i.reference} and all its repayment records?`)) return;
    const { error } = await supabase.from('injections').delete().eq('id', i.id);
    if (error) return toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
    await logAudit('delete', 'injections', i.id, { reference: i.reference });
    load();
  };

  const reprintRepayment = (r: Repayment) => {
    const inj = injections.find(i => i.id === r.injection_id);
    const repaidToDate = repayments
      .filter(x => x.injection_id === r.injection_id && new Date(x.created_at) <= new Date(r.created_at))
      .reduce((s, x) => s + Number(x.amount), 0);
    setReceipt({
      kind: 'repayment',
      receiptNumber: r.receipt_number,
      date: new Date(r.created_at),
      source: inj?.source ?? 'Injection',
      amount: Number(r.amount),
      paymentMethod: r.payment_method,
      paidOn: new Date(r.paid_on).toLocaleDateString(),
      totalDebt: inj ? Number(inj.amount) : undefined,
      totalRepaid: repaidToDate,
      outstanding: inj ? Math.max(0, Number(inj.amount) - repaidToDate) : undefined,
      notes: r.notes ?? undefined,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Money Injection</h1>
          <p className="text-muted-foreground">
            Money put into the business is recorded as a debt to be repaid &mdash; never counted as profit.
          </p>
        </div>
        <Button variant="pos" onClick={() => setOpen(true)}><Plus className="mr-2 h-5 w-5" /> Record injection</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total injected (debt)', value: money(totals.debt) },
          { label: 'Repaid', value: money(totals.repaid) },
          { label: 'Still owing', value: money(totals.outstanding) },
          { label: 'Injections', value: String(totals.count) },
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
        ) : injections.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No money injections recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Reference</th><th>From</th><th>Received</th><th>Due</th>
                  <th className="text-right">Injected</th><th className="text-right">Repaid</th>
                  <th className="text-right">Owing</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {injections.map(i => {
                  const repaid = paidByInjection.get(i.id) ?? 0;
                  const owing = Math.max(0, Number(i.amount) - repaid);
                  const paid = owing <= 0.009;
                  return (
                    <tr key={i.id}>
                      <td className="font-mono text-xs">{i.reference}</td>
                      <td className="font-medium">{i.source}</td>
                      <td>{new Date(i.received_on).toLocaleDateString()}</td>
                      <td>{i.due_date ? new Date(i.due_date).toLocaleDateString() : '-'}</td>
                      <td className="text-right font-semibold">{money(Number(i.amount))}</td>
                      <td className="text-right">{money(repaid)}</td>
                      <td className="text-right font-semibold">{money(owing)}</td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paid ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {paid ? 'Paid' : 'Outstanding'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" disabled={paid} onClick={() => { setPayTarget(i); setPayForm(emptyRepayment); }}>
                            <HandCoins className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReceipt({
                              kind: 'injection',
                              receiptNumber: i.reference,
                              date: new Date(i.created_at),
                              source: i.source,
                              amount: Number(i.amount),
                              paidOn: new Date(i.received_on).toLocaleDateString(),
                              totalDebt: Number(i.amount),
                              totalRepaid: repaid,
                              outstanding: owing,
                              notes: i.notes ?? undefined,
                            })}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeInjection(i)}>
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

      {repayments.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Repayments made</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr><th>Receipt</th><th>Injection</th><th>Paid on</th><th>Method</th><th className="text-right">Amount</th><th></th></tr>
              </thead>
              <tbody>
                {repayments.map(r => {
                  const inj = injections.find(i => i.id === r.injection_id);
                  return (
                    <tr key={r.id}>
                      <td className="font-mono text-xs">{r.receipt_number}</td>
                      <td>{inj ? `${inj.reference} - ${inj.source}` : '-'}</td>
                      <td>{new Date(r.paid_on).toLocaleDateString()}</td>
                      <td className="capitalize">{r.payment_method.replace(/_/g, ' ')}</td>
                      <td className="text-right font-semibold">{money(Number(r.amount))}</td>
                      <td className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => reprintRepayment(r)}><Printer className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record a money injection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Received from</Label>
              <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. Owner capital / John Moyo loan" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Received on</Label>
                <Input type="date" value={form.received_on} onChange={e => setForm({ ...form, received_on: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Return by (optional)</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              This amount is treated as a debt owed by the business. It is excluded from revenue and profit.
            </p>
          </div>
          <DialogFooter>
            <Button variant="pos" onClick={saveInjection} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />} Save &amp; issue receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={o => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Repay {payTarget?.source}</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Balance owing: <span className="font-semibold text-foreground">{money(Number(payTarget.amount) - (paidByInjection.get(payTarget.id) ?? 0))}</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Amount repaid ($)</Label>
                  <Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Input value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Paid on</Label>
                  <Input type="date" value={payForm.paid_on} onChange={e => setPayForm({ ...payForm, paid_on: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="pos" onClick={saveRepayment} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandCoins className="mr-2 h-4 w-4" />} Record repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={o => !o && setReceipt(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{receipt?.kind === 'repayment' ? 'Repayment receipt' : 'Injection receipt'}</DialogTitle></DialogHeader>
          {receipt && <InjectionReceipt ref={receiptRef} data={receipt} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => receiptRef.current && downloadReceiptPdf(receiptRef.current, `Injection-Receipt-${receipt?.receiptNumber ?? ''}`)}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="pos" onClick={() => receiptRef.current && printReceiptHtml(receiptRef.current.innerHTML)}>
              <Printer className="mr-2 h-4 w-4" /> Print receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
