import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Truck,
  CreditCard,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts } from '@/lib/db';
import { DashboardMetrics, PaymentMethod, Product, Transaction, TransactionStatus } from '@/types';

const emptyMetrics: DashboardMetrics = {
  todaySales: 0,
  todayTransactions: 0,
  averageOrderValue: 0,
  lowStockItems: 0,
  pendingDeliveries: 0,
  outstandingReceivables: 0,
  upfrontReceived: 0,
  orderBalances: 0,
};

const receivedAmount = (s: { doc_type?: string | null; total: number | string; amount_paid?: number | string | null }) =>
  s.doc_type === 'upfront' ? Number(s.amount_paid ?? 0) : Number(s.total);

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [products, setProducts] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);

  useEffect(() => {
    (async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [productsRes, salesRes, clientsRes, transportersRes] = await Promise.all([
        fetchProducts().catch(() => [] as Product[]),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('clients').select('outstanding_balance'),
        supabase.from('transporters').select('status'),
      ]);

      const sales = (salesRes.data ?? []).filter(s => s.status !== 'voided');
      const todays = sales.filter(s => new Date(s.created_at) >= startOfDay);
      const todaySales = todays.reduce((sum, s) => sum + Number(s.total), 0);

      setProducts(productsRes);
      setMetrics({
        todaySales,
        todayTransactions: todays.length,
        averageOrderValue: todays.length ? todaySales / todays.length : 0,
        lowStockItems: productsRes.filter(p => p.currentStock <= p.lowStockThreshold).length,
        pendingDeliveries: (transportersRes.data ?? []).filter(t => t.status === 'in_transit').length,
        outstandingReceivables: (clientsRes.data ?? []).reduce((s, c) => s + Number(c.outstanding_balance ?? 0), 0),
      });

      setRecent(
        sales.slice(0, 8).map(s => ({
          id: s.id,
          invoiceNumber: s.receipt_number,
          items: [],
          subtotal: Number(s.subtotal),
          vatAmount: Number(s.vat_amount),
          discount: Number(s.discount ?? 0),
          total: Number(s.total),
          paymentMethod: s.payment_method as PaymentMethod,
          cashierId: s.cashier_id ?? '',
          cashierName: s.cashier_name ?? '—',
          clientName: s.client_name ?? undefined,
          status: s.status as TransactionStatus,
          createdAt: new Date(s.created_at),
          currency: 'USD',
        }))
      );
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Today's Sales"
          value={`$${metrics.todaySales.toFixed(2)}`}
          icon={DollarSign}
          variant="primary"
        />
        <MetricCard title="Transactions" value={metrics.todayTransactions} icon={ShoppingCart} />
        <MetricCard title="Avg Order Value" value={`$${metrics.averageOrderValue.toFixed(2)}`} icon={TrendingUp} />
        <MetricCard title="Low Stock Items" value={metrics.lowStockItems} icon={Package} variant="warning" />
        <MetricCard title="Pending Deliveries" value={metrics.pendingDeliveries} icon={Truck} />
        <MetricCard
          title="Receivables"
          value={`$${metrics.outstandingReceivables.toFixed(2)}`}
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions transactions={recent} />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <LowStockAlert products={products.filter(p => p.currentStock <= p.lowStockThreshold)} />
        </div>
      </div>
    </div>
  );
}
