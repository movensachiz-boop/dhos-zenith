import { AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface LowStockAlertProps {
  products: Product[];
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  const lowStockProducts = products.filter(p => p.currentStock <= p.lowStockThreshold);

  if (lowStockProducts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Stock Alerts</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
            <span className="text-success text-xl">✓</span>
          </div>
          <p className="text-sm">All stock levels healthy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
        <span className="ml-auto rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          {lowStockProducts.length} items
        </span>
      </div>
      <div className="space-y-3">
        {lowStockProducts.slice(0, 5).map((product) => (
          <div key={product.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.sku}</p>
            </div>
            <div className={cn(
              "text-sm font-semibold",
              product.currentStock <= product.lowStockThreshold / 2 ? "text-destructive" : "text-warning"
            )}>
              {product.currentStock} left
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
