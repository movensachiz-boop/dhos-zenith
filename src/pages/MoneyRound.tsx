import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Printer, Trash2, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/db';
import { printReceiptHtml } from '@/lib/receiptPrint';
import { RoundReceipt, RoundReceiptData } from '@/components/round/RoundReceipt';
import { countdownTo, cycleDate, nextCycleDate, useNow } from '@/lib/countdown';

type Round = {
  id: string;
  name: string;
  monthly_amount: number;
  start_month: string;
  currency: string;
  notes: string | null;
  cycle_days: number;
  start_date: string | null;
};

type Member = {
  id: string;
  round_id: string;
  name: string;
  phone: string | null;
  position: number;
  is_me: boolean;
};

type Entry = {
  id: string;
  round_id: string;
  member_id: string | null;
  member_name: string;
  month: string;
  month_index: number;
  direction: 'in' | 'out';
  amount: number;
  receipt_number: string;
  note: string | null;
  created_at: string;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
const addMonths = (iso: string, n: number) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, (m - 1) + n, 1);
};
const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const receiptNo = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}`;
const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function MoneyRound() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<{ amount: number; paid_on: string }[]>([]);
  const now = useNow(30000);

  const [roundOpen, setRoundOpen] = useState(false);
  const [roundForm, setRoundForm] = useState({
    name: '',
    monthly_amount: '100',
    start_date: new Date().toISOString().slice(0, 10),
    cycle_days: '30',
  });
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', is_me: false });
  const [saving, setSaving] = useState(false);

  const [receipt, setReceipt] = useState<RoundReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const round = rounds.find(r => r.id === activeId) ?? null;

  const loadRounds = async () => {
    const { data, error } = await supabase.from('money_rounds').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load rounds', description: error.message, variant: 'destructive' });
    const list = ((data ?? []) as unknown as Round[]);
    setRounds(list);
    setActiveId(prev => prev && list.some(r => r.id === prev) ? prev : (list[0]?.id ?? null));
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    const [m, e] = await Promise.all([
      supabase.from('round_members').select('*').eq('round_id', id).order('position'),
      supabase.from('round_entries').select('*').eq('round_id', id).order('created_at', { ascending: false }),
    ]);
    setMembers((m.data ?? []) as unknown as Member[]);
    setEntries((e.data ?? []) as unknown as Entry[]);
  };

  useEffect(() => {
    loadRounds();
    supabase
      .from('expenses')
      .select('amount, paid_on')
      .then(({ data }) => setExpenses(((data ?? []) as { amount: number; paid_on: string }[])));
  }, []);
  useEffect(() => { if (activeId) loadDetail(activeId); else { setMembers([]); setEntries([]); } }, [activeId]);

  const memberCount = members.length;
  const monthly = Number(round?.monthly_amount ?? 0);
  const payoutAmount = monthly * Math.max(memberCount - 1, 0);
  const poolPerMonth = monthly * memberCount;
  const cycleDays = Math.max(1, Number(round?.cycle_days ?? 30));
  const startBase = round ? (round.start_date ?? round.start_month) : null;
  const periodLabel = (d: Date) => (cycleDays >= 28 ? monthLabel(d) : dayLabel(d));

  const nextCycle = useMemo(() => {
    if (!startBase) return null;
    const { date, cycleIndex } = nextCycleDate(startBase, cycleDays, now);
    return { date, cycleIndex, countdown: countdownTo(date, now) };
  }, [startBase, cycleDays, now]);

  const schedule = useMemo(() => {
    if (!round || !startBase) return [];
    return members.map(mem => {
      const date = cycleDate(startBase, cycleDays, mem.position);
      return { member: mem, monthIndex: mem.position, date, label: periodLabel(date) };
    });
  }, [members, round, startBase, cycleDays]);

  const me = members.find(m => m.is_me) ?? null;

  const myCashflow = useMemo(() => {
    if (!round || !me) return [];
    return Array.from({ length: memberCount }, (_, i) => {
      const idx = i + 1;
      const date = cycleDate(startBase!, cycleDays, idx);
      const isPayout = me.position === idx;
      return {
        monthIndex: idx,
        date,
        label: periodLabel(date),
        direction: (isPayout ? 'in' : 'out') as 'in' | 'out',
        amount: isPayout ? payoutAmount : monthly,
      };
    });
  }, [round, me, memberCount, payoutAmount, monthly, startBase, cycleDays]);

  const recorded = (memberId: string, monthIndex: number) =>
    entries.find(e => e.member_id === memberId && e.month_index === monthIndex);

  const createRound = async () => {
    if (!roundForm.name.trim()) return toast({ title: 'Round name is required', variant: 'destructive' });
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('money_rounds').insert({
      user_id: auth.user!.id,
      name: roundForm.name.trim(),
      monthly_amount: Number(roundForm.monthly_amount) || 0,
      start_month: `${roundForm.start_date.slice(0, 7)}-01`,
      start_date: roundForm.start_date,
      cycle_days: Number(roundForm.cycle_days) || 30,
    }).select().single();
    setSaving(false);
    if (error) return toast({ title: 'Could not create round', description: error.message, variant: 'destructive' });
    await logAudit('create', 'money_rounds', (data as { id: string }).id, { name: roundForm.name });
    setRoundOpen(false);
    setRoundForm({ name: '', monthly_amount: '100', start_date: new Date().toISOString().slice(0, 10), cycle_days: '30' });
    await loadRounds();
    setActiveId((data as { id: string }).id);
  };

  const addMember = async () => {
    if (!round) return;
    if (!memberForm.name.trim()) return toast({ title: 'Member name is required', variant: 'destructive' });
    setSaving(true);
    const { error } = await supabase.from('round_members').insert({
      round_id: round.id,
      name: memberForm.name.trim(),
      phone: memberForm.phone.trim() || null,
      position: members.length + 1,
      is_me: memberForm.is_me,
    });
    setSaving(false);
    if (error) return toast({ title: 'Could not add member', description: error.message, variant: 'destructive' });
    setMemberForm({ name: '', phone: '', is_me: false });
    setMemberOpen(false);
    loadDetail(round.id);
  };

  const removeMember = async (id: string) => {
    if (!round) return;
    const { error } = await supabase.from('round_members').delete().eq('id', id);
    if (error) return toast({ title: 'Could not remove member', description: error.message, variant: 'destructive' });
    const remaining = members.filter(m => m.id !== id);
    await Promise.all(remaining.map((m, i) => supabase.from('round_members').update({ position: i + 1 }).eq('id', m.id)));
    loadDetail(round.id);
  };

  const record = async (opts: {
    member: Member; monthIndex: number; date: Date; direction: 'in' | 'out'; amount: number;
  }) => {
    if (!round) return;
    const number = receiptNo(opts.direction === 'in' ? 'RPO' : 'RCO');
    const payload = {
      round_id: round.id,
      member_id: opts.member.id,
      member_name: opts.member.name,
      month: monthKey(opts.date),
      month_index: opts.monthIndex,
      direction: opts.direction,
      amount: opts.amount,
      receipt_number: number,
    };
    const { error } = await supabase.from('round_entries').insert(payload);
    if (error) return toast({ title: 'Could not record', description: error.message, variant: 'destructive' });
    await logAudit('create', 'round_entries', undefined, payload);
    toast({ title: opts.direction === 'in' ? 'Cash in recorded' : 'Cash out recorded' });
    loadDetail(round.id);
    setReceipt({
      receiptNumber: number,
      date: new Date(),
      roundName: round.name,
      memberName: opts.member.name,
      memberPhone: opts.member.phone ?? undefined,
      monthLabel: monthLabel(opts.date),
      monthIndex: opts.monthIndex,
      direction: opts.direction,
      amount: opts.amount,
      monthlyAmount: monthly,
      memberCount,
    });
  };

  const reprint = (e: Entry) => {
    const mem = members.find(m => m.id === e.member_id);
    setReceipt({
      receiptNumber: e.receipt_number,
      date: new Date(e.created_at),
      roundName: round?.name ?? '',
      memberName: e.member_name,
      memberPhone: mem?.phone ?? undefined,
      monthLabel: periodLabel(addMonths(e.month, 0)),
      monthIndex: e.month_index,
      direction: e.direction,
      amount: Number(e.amount),
      monthlyAmount: monthly,
      memberCount,
    });
  };

  const totalIn = entries.filter(e => e.direction === 'in').reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = entries.filter(e => e.direction === 'out').reduce((s, e) => s + Number(e.amount), 0);

  const roundExpenses = useMemo(() => {
    if (!startBase) return 0;
    const start = new Date(startBase).getTime();
    const end = new Date(startBase).getTime() + Math.max(memberCount, 1) * cycleDays * 86400000;
    return expenses
      .filter(x => {
        const t = new Date(x.paid_on).getTime();
        return t >= start && t <= end;
      })
      .reduce((s, x) => s + Number(x.amount), 0);
  }, [expenses, startBase, memberCount, cycleDays]);

  const netProfit = totalIn - totalOut - roundExpenses;

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Money Round</h1>
          <p className="text-muted-foreground">Pooled savings — cycle countdown, payout schedule, cash in / cash out and receipts.</p>
        </div>
        <Button variant="pos" onClick={() => setRoundOpen(true)}><Plus className="mr-2 h-5 w-5" /> New round</Button>
      </div>

      {rounds.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          No rounds yet. Create one to start pooling.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {rounds.map(r => (
              <Button key={r.id} variant={r.id === activeId ? 'default' : 'outline'} size="sm" onClick={() => setActiveId(r.id)}>
                {r.name}
              </Button>
            ))}
          </div>

          {round && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: `Contribution / ${cycleDays} days`, value: money(monthly) },
                  { label: 'Members', value: String(memberCount) },
                  { label: 'Pool per cycle', value: money(poolPerMonth) },
                  { label: 'Payout per member', value: money(payoutAmount) },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border bg-card p-4">
                    <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-xl font-bold">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Countdown & profit */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs uppercase text-muted-foreground">Next cycle in</p>
                  <p className={`mt-1 text-3xl font-bold ${nextCycle?.countdown?.overdue ? 'text-destructive' : 'text-primary'}`}>
                    {nextCycle?.countdown
                      ? `${nextCycle.countdown.days}d ${nextCycle.countdown.hours}h`
                      : '—'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextCycle ? `Cycle #${nextCycle.cycleIndex} on ${dayLabel(nextCycle.date)} · every ${cycleDays} days` : ''}
                  </p>
                  {me && nextCycle ? (
                    <p className="mt-3 text-sm">
                      {me.position === nextCycle.cycleIndex ? (
                        <span className="font-bold text-primary">Your turn — you receive {money(payoutAmount)}</span>
                      ) : (
                        <>You pay <span className="font-bold">{money(monthly)}</span> this cycle. Your payout ({money(payoutAmount)}) lands on{' '}
                        <span className="font-bold">{dayLabel(cycleDate(startBase!, cycleDays, me.position))}</span>.</>
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs uppercase text-muted-foreground">Round profitability</p>
                  <p className={`mt-1 text-3xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {netProfit >= 0 ? '+' : '-'}{money(Math.abs(netProfit))}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {netProfit >= 0 ? 'Profit after contributions and bills' : 'Loss after contributions and bills'}
                  </p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Cash in (payouts)</span><span className="font-semibold text-primary">+{money(totalIn)}</span></div>
                    <div className="flex justify-between"><span>Cash out (contributions)</span><span className="font-semibold">-{money(totalOut)}</span></div>
                    <div className="flex justify-between"><span>Bills &amp; expenses in period</span><span className="font-semibold">-{money(roundExpenses)}</span></div>
                  </div>
                </div>
              </div>

              {/* Members & payout months */}
              <div className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b p-4">
                  <h2 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Pool members & payout months</h2>
                  <Button size="sm" variant="outline" onClick={() => setMemberOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add member</Button>
                </div>
                {members.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">Add the pool members to build the schedule.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th>#</th><th>Member</th><th>Contact</th><th>Payout date</th><th>Receives</th><th>Status</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map(s => {
                          const done = recorded(s.member.id, s.monthIndex);
                          return (
                            <tr key={s.member.id}>
                              <td>{s.monthIndex}</td>
                              <td className="font-medium">{s.member.name}{s.member.is_me ? ' (You)' : ''}</td>
                              <td>{s.member.phone ?? '-'}</td>
                              <td>{s.label}</td>
                              <td className="font-bold">{money(payoutAmount)}</td>
                              <td>{done ? <span className="text-xs font-semibold text-primary">Recorded</span> : <span className="text-xs text-muted-foreground">Pending</span>}</td>
                              <td className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline"
                                    onClick={() => record({ member: s.member, monthIndex: s.monthIndex, date: s.date, direction: 'in', amount: payoutAmount })}>
                                    <Wallet className="mr-1 h-4 w-4" /> Payout
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => removeMember(s.member.id)}>
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

              {/* My cashflow */}
              <div className="rounded-xl border bg-card">
                <div className="border-b p-4">
                  <h2 className="font-semibold">My cash flow {me ? `— ${me.name} (position ${me.position})` : ''}</h2>
                  <p className="text-sm text-muted-foreground">
                    {me ? 'Your payout cycle is cash in, every other cycle is cash out.' : 'Mark one member as "This is me" to see your cash flow.'}
                  </p>
                </div>
                {me && (
                  <div className="overflow-x-auto">
                    <table className="data-table w-full">
                      <thead><tr><th>Cycle #</th><th>Date</th><th>Type</th><th>Amount</th><th></th></tr></thead>
                      <tbody>
                        {myCashflow.map(row => (
                          <tr key={row.monthIndex}>
                            <td>{row.monthIndex}</td>
                            <td>{row.label}</td>
                            <td>{row.direction === 'in' ? 'Cash in' : 'Cash out'}</td>
                            <td className={row.direction === 'in' ? 'font-bold text-primary' : 'font-medium'}>
                              {row.direction === 'in' ? '+' : '-'}{money(row.amount)}
                            </td>
                            <td className="text-right">
                              <Button size="sm" variant="outline"
                                onClick={() => record({ member: me, monthIndex: row.monthIndex, date: row.date, direction: row.direction, amount: row.amount })}>
                                Record & receipt
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Ledger */}
              <div className="rounded-xl border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                  <h2 className="font-semibold">Round ledger</h2>
                  <p className="text-sm">
                    <span className="text-primary font-bold">In {money(totalIn)}</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span className="font-bold">Out {money(totalOut)}</span>
                  </p>
                </div>
                {entries.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">No movements recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table w-full">
                      <thead><tr><th>Receipt</th><th>Member</th><th>Month</th><th>Type</th><th>Amount</th><th></th></tr></thead>
                      <tbody>
                        {entries.map(e => (
                          <tr key={e.id}>
                            <td className="font-mono text-xs">{e.receipt_number}</td>
                            <td>{e.member_name}</td>
                            <td>{periodLabel(addMonths(e.month, 0))}</td>
                            <td>{e.direction === 'in' ? 'Cash in' : 'Cash out'}</td>
                            <td className={e.direction === 'in' ? 'font-bold text-primary' : ''}>
                              {e.direction === 'in' ? '+' : '-'}{money(Number(e.amount))}
                            </td>
                            <td className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => reprint(e)}><Printer className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* New round dialog */}
      <Dialog open={roundOpen} onOpenChange={setRoundOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New money round</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Round name</Label>
              <Input value={roundForm.name} onChange={e => setRoundForm({ ...roundForm, name: e.target.value })} placeholder="e.g. Maita Round 2026" />
            </div>
            <div className="space-y-2">
              <Label>Amount per member per cycle ($)</Label>
              <Input type="number" value={roundForm.monthly_amount} onChange={e => setRoundForm({ ...roundForm, monthly_amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cycle length (days)</Label>
              <Input type="number" min={1} value={roundForm.cycle_days} onChange={e => setRoundForm({ ...roundForm, cycle_days: e.target.value })} />
              <p className="text-xs text-muted-foreground">e.g. 6 means money circulates every 6 days; 30 keeps it monthly.</p>
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={roundForm.start_date} onChange={e => setRoundForm({ ...roundForm, start_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="pos" onClick={createRound} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add pool member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Input value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={memberForm.is_me} onCheckedChange={v => setMemberForm({ ...memberForm, is_me: Boolean(v) })} />
              This is me
            </label>
            <p className="text-xs text-muted-foreground">
              Payout position is assigned in the order members are added (next: #{members.length + 1}).
            </p>
          </div>
          <DialogFooter>
            <Button variant="pos" onClick={addMember} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receipt} onOpenChange={o => !o && setReceipt(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Round receipt</DialogTitle></DialogHeader>
          {receipt ? <RoundReceipt ref={receiptRef} data={receipt} /> : null}
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
