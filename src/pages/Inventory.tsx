import { useEffect, useState } from 'react';
import { Loader2, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts, logAudit } from '@/lib/db';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Product | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      toast({ title: 'Failed to load inventory', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const adjust = async () => {
    if (!target) return;
    const change = Number(amount);
    if (!Number.isFinite(change) || change === 0) {
      toast({ title: 'Enter a non-zero amount', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const newStock = target.currentStock + change;
    const { error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', target.id);
    if (!error) {
      await supabase.from('stock_movements').insert({
        product_id: target.id,
        change,
        reason: change > 0 ? 'stock_in' : 'adjustment',
        user_id: auth.user?.id ?? null,
      });
      await logAudit('stock_adjust', 'product', target.id, { change, newStock });
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Could not adjust stock', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Stock updated', description: `${target.name} is now ${newStock}` });
    setTarget(null);
    setAmount('');
    load();
  };

  const lowStock = products.filter(p => p.currentStock <= p.lowStockThreshold);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">Stock levels, restocking and low-stock alerts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Low stock items</p>
          <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Stock value (cost)</p>
          <p className="text-2xl font-bold text-primary">
            ${products.reduce((s, p) => s + p.currentStock * p.costPrice, 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No products yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Unit</th>
                <th className="text-center">Stock</th><th className="text-center">Threshold</th><th className="w-32"></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="font-mono text-sm text-muted-foreground">{p.sku}</td>
                  <td>{p.unitOfMeasure}</td>
                  <td className="text-center">
                    <span className={cn(
                      'inline-flex px-2 py-1 rounded-md text-xs font-semibold',
                      p.currentStock <= p.lowStockThreshold ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    )}>{p.currentStock}</span>
                  </td>
                  <td className="text-center">{p.lowStockThreshold}</td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => setTarget(p)}>
                      <PackagePlus className="h-4 w-4 mr-1" /> Adjust
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>{target?.name} · current {target?.currentStock}</DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            autoFocus
            placeholder="e.g. 20 or -5"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adjust(); } }}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={adjust} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
