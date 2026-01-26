import { ShoppingCart, Plus, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'New Sale', icon: ShoppingCart, href: '/pos', variant: 'pos' as const },
    { label: 'Add Product', icon: Plus, href: '/products', variant: 'pos-secondary' as const },
    { label: 'New Invoice', icon: FileText, href: '/invoices', variant: 'pos-secondary' as const },
    { label: 'Stock Adjustment', icon: Package, href: '/inventory', variant: 'pos-secondary' as const },
  ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate(action.href)}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
