import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2, Save, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/db';

type StaffUser = {
  user_id: string;
  name: string;
  email: string;
  is_active: boolean | null;
  roles: string[];
};

const ROLES = [
  { value: 'super_admin', label: 'Super Admin (full access)' },
  { value: 'admin', label: 'Admin (full access)' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'auditor', label: 'Auditor' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [pwEdits, setPwEdits] = useState<Record<string, string>>({});

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
    if (error) {
      const msg = (data as { error?: string } | null)?.error ?? error.message;
      throw new Error(msg);
    }
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, unknown>;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call({ action: 'list' });
      setUsers((res.users as StaffUser[]) ?? []);
      setDenied(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      if (msg.toLowerCase().includes('admin')) setDenied(true);
      else toast({ title: 'Could not load users', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await call({ action: 'create', ...form });
      toast({ title: 'User created', description: `${form.name} can now sign in with ${form.email}.` });
      await logAudit('create', 'user', undefined, { email: form.email, role: form.role });
      setForm({ name: '', email: '', password: '', role: 'admin' });
      load();
    } catch (err) {
      toast({ title: 'Could not create user', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (u: StaffUser, patch: Record<string, unknown>) => {
    try {
      await call({ action: 'update', user_id: u.user_id, ...patch });
      toast({ title: 'User updated', description: u.email });
      setPwEdits((p) => ({ ...p, [u.user_id]: '' }));
      load();
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  const removeUser = async (u: StaffUser) => {
    if (!confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
    try {
      await call({ action: 'delete', user_id: u.user_id });
      await logAudit('delete', 'user', u.user_id, { email: u.email });
      toast({ title: 'User deleted', description: u.email });
      load();
    } catch (err) {
      toast({ title: 'Delete failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  if (denied) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">Only administrators can manage user accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Create staff accounts, set passwords and access levels.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add new user</CardTitle>
          <CardDescription>The account is active immediately — no email confirmation needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="text" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Access level</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create user
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No users yet.</p>
          ) : (
            users.map((u) => (
              <div key={u.user_id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Access level</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={u.roles[0] ?? 'cashier'}
                    onChange={(e) => updateUser(u, { role: e.target.value })}
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">New password</Label>
                  <div className="flex gap-2">
                    <Input
                      className="h-9"
                      placeholder="Leave blank to keep"
                      value={pwEdits[u.user_id] ?? ''}
                      onChange={(e) => setPwEdits({ ...pwEdits, [u.user_id]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!(pwEdits[u.user_id] ?? '').trim()}
                      onClick={() => updateUser(u, { password: pwEdits[u.user_id] })}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => removeUser(u)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
