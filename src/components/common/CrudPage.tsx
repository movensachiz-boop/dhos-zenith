import { useEffect, useState, ReactNode } from 'react';
import { Plus, Loader2, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/db';
import { useCachedState, isOffline } from '@/lib/cache';

export type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'tel';
  required?: boolean;
  placeholder?: string;
  hideInTable?: boolean;
  format?: (value: unknown) => ReactNode;
};

type TableName = 'clients' | 'suppliers' | 'transporters';

interface CrudPageProps {
  table: TableName;
  title: string;
  subtitle: string;
  fields: FieldDef[];
  searchKeys: string[];
}

type Row = Record<string, unknown> & { id: string };

export default function CrudPage({ table, title, subtitle, fields, searchKeys }: CrudPageProps) {
  const [rows, setRows, hadCache] = useCachedState<Row[]>(`mc_${table}_cache`, []);
  const [loading, setLoading] = useState(!hadCache);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (isOffline()) { setLoading(false); return; }
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) {
      if (!hadCache) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    } else setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const save = async () => {
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        toast({ title: `${f.label} is required`, variant: 'destructive' });
        return;
      }
    }
    setSaving(true);
    const payload: Record<string, unknown> = {};
    fields.forEach(f => {
      const raw = form[f.key];
      if (raw === undefined || raw === '') return;
      payload[f.key] = f.type === 'number' ? Number(raw) : raw.trim();
    });
    const { error } = await supabase.from(table).insert(payload as never);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    await logAudit('create', table, undefined, payload);
    toast({ title: `${title} record saved` });
    setForm({});
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    await logAudit('delete', table, id);
    toast({ title: 'Record deleted' });
    load();
  };

  const visible = fields.filter(f => !f.hideInTable);
  const filtered = rows.filter(r =>
    searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="pos" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5 mr-2" /> Add
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No records yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {visible.map(f => <th key={f.key}>{f.label}</th>)}
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id}>
                  {visible.map(f => (
                    <td key={f.key}>{f.format ? f.format(row[f.key]) : String(row[f.key] ?? '—')}</td>
                  ))}
                  <td>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => remove(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add {title.replace(/s$/, '')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {f.label}{f.required ? ' *' : ''}
                </label>
                <Input
                  type={f.type === 'number' ? 'number' : f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
