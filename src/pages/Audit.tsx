import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCachedState, isOffline } from '@/lib/cache';

type Log = {
  id: string;
  user_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: unknown;
  created_at: string;
};

export default function Audit() {
  const [logs, setLogs, hadCache] = useCachedState<Log[]>('mc_audit_cache', []);
  const [loading, setLoading] = useState(!hadCache);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      if (isOffline()) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        if (!hadCache) toast({ title: 'Failed to load audit trail', description: error.message, variant: 'destructive' });
      } else setLogs((data ?? []) as unknown as Log[]);
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter(l =>
    `${l.action} ${l.entity} ${l.user_name ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">Immutable log of critical actions</p>
      </div>

      <Input
        placeholder="Search action, entity or user..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.user_name ?? '—'}</td>
                  <td className="font-medium capitalize">{l.action.replace('_', ' ')}</td>
                  <td className="capitalize">{l.entity}</td>
                  <td className="text-xs text-muted-foreground max-w-sm truncate">
                    {l.details ? JSON.stringify(l.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
