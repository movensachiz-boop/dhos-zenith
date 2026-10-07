import { useEffect, useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { branchName } from '@/lib/branch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useCachedState, isOffline } from '@/lib/cache';

type Settings = {
  id: string;
  store_name: string;
  tagline: string;
  phone: string;
  address: string | null;
  vat_rate: number;
  currency: string;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings, hadCache] = useCachedState<Settings | null>('mc_settings_cache', null);
  const [loading, setLoading] = useState(!hadCache);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (isOffline()) { setLoading(false); return; }
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (error) {
        if (!hadCache) toast({ title: 'Failed to load settings', description: error.message, variant: 'destructive' });
      } else if (data) setSettings(data as unknown as Settings);
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<Settings>) => setSettings(settings ? { ...settings, ...patch } : settings);
  const [clearing, setClearing] = useState(false);

  const clearAll = async () => {
    if (!confirm(`Delete ALL data for ${branchName()}? This cannot be undone.`)) return;
    if (prompt('Type CLEAR to confirm') !== 'CLEAR') return;
    setClearing(true);
    const { error } = await supabase.rpc('clear_branch_data' as never);
    setClearing(false);
    if (error) {
      toast({ title: 'Could not clear data', description: error.message, variant: 'destructive' });
      return;
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith('mc_') && !['mc_branch', 'mc_logo_data_url', 'mc_settings_cache'].includes(k))
      .forEach(k => localStorage.removeItem(k));
    await logAudit('clear_all', 'system', branchName());
    toast({ title: 'All data cleared' });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({
        store_name: settings.store_name,
        tagline: settings.tagline,
        phone: settings.phone,
        address: settings.address,
        vat_rate: Number(settings.vat_rate),
        currency: settings.currency,
      })
      .eq('id', settings.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save settings', description: error.message, variant: 'destructive' });
      return;
    }
    await logAudit('update', 'settings', settings.id);
    toast({ title: 'Settings saved' });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!settings) return <p className="p-12 text-center text-muted-foreground">No settings record found.</p>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Store details, tax and currency</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Field label="Store name" value={settings.store_name} onChange={v => update({ store_name: v })} />
        <Field label="Tagline" value={settings.tagline} onChange={v => update({ tagline: v })} />
        <Field label="Phone" value={settings.phone} onChange={v => update({ phone: v })} />
        <Field label="Address" value={settings.address ?? ''} onChange={v => update({ address: v })} />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="VAT rate (e.g. 0.15)"
            value={String(settings.vat_rate)}
            type="number"
            onChange={v => update({ vat_rate: Number(v) })}
          />
          <Field label="Currency" value={settings.currency} onChange={v => update({ currency: v })} />
        </div>
        <Button onClick={save} disabled={saving} variant="pos">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Save settings</>}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-2">
        <h2 className="font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        <p className="text-sm text-muted-foreground">Business: {branchName()}</p>
      </div>

      <div className="rounded-xl border border-destructive/40 bg-card p-6 space-y-3">
        <h2 className="font-semibold text-destructive">Clear everything</h2>
        <p className="text-sm text-muted-foreground">
          Permanently deletes all sales, products, stock, customers, quotations, money rounds, injections and expenses for {branchName()}. User accounts are kept.
        </p>
        <Button variant="destructive" onClick={clearAll} disabled={clearing}>
          {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-2" />Clear everything</>}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
