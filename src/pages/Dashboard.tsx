import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Truck,
  CreditCard,
  Clock,
  Wallet,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts } from '@/lib/db';
import { countdownTo, useNow } from '@/lib/countdown';
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

type UpfrontOrder = {
  id: string;
  receipt_number: string;
  client_name: string | null;
  client_phone: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  due_date: string | null;
  created_at: string;
};

const receivedAmount = (s: { doc_type?: string | null; total: number | string; amount_paid?: number | string | null }) =>
  s.doc_type === 'upfront' ? Number(s.amount_paid ?? 0) : Number(s.total);

export default function Dashboard() {
  const now = useNow();
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [products, setProducts] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [upfronts, setUpfronts] = useState<UpfrontOrder[]>([]);

  useEffect(() => {
    (async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [productsRes, salesRes, clientsRes, transportersRes] = await Promise.all([
        fetchProducts().catch(() => [] as Product[]),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('clients').select('outstanding_balance'),
        supabase.from('transporters').select('status'),
      ]);

      const sales = (salesRes.data ?? []).filter(s => s.status !== 'voided');
      const todays = sales.filter(s => new Date(s.created_at) >= startOfDay);
      const todaySales = todays.reduce((sum, s) => sum + receivedAmount(s), 0);
      const upfrontSales = sales.filter(s => s.doc_type === 'upfront');

      setProducts(productsRes);
      setMetrics({
        todaySales,
        todayTransactions: todays.length,
        averageOrderValue: todays.length ? todaySales / todays.length : 0,
        lowStockItems: productsRes.filter(p => p.currentStock <= p.lowStockThreshold).length,
        pendingDeliveries: (transportersRes.data ?? []).filter(t => t.status === 'in_transit').length,
        outstandingReceivables: (clientsRes.data ?? []).reduce((s, c) => s + Number(c.outstanding_balance ?? 0), 0),
        upfrontReceived: upfrontSales.reduce((s, x) => s + Number(x.amount_paid ?? 0), 0),
        orderBalances: sales.reduce((s, x) => s + Number(x.balance_due ?? 0), 0),
      });

      setUpfronts(
        upfrontSales
          .filter(s => Number(s.balance_due ?? 0) > 0 || s.due_date)
          .map(s => ({
            id: s.id,
            receipt_number: s.receipt_number,
            client_name: s.client_name,
            client_phone: s.client_phone,
            total: Number(s.total),
            amount_paid: Number(s.amount_paid ?? 0),
            balance_due: Number(s.balance_due ?? 0),
            due_date: s.due_date,
            created_at: s.created_at,
          }))
          .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
      );

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
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of today's trading and outstanding orders.</p>
        </div>
        <p className="text-xs text-muted-foreground">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Cash In"
          value={`$${metrics.todaySales.toFixed(2)}`}
          icon={DollarSign}
          variant="primary"
        />
        <MetricCard title="Transactions" value={metrics.todayTransactions} icon={ShoppingCart} />
        <MetricCard title="Avg Order Value" value={`$${metrics.averageOrderValue.toFixed(2)}`} icon={TrendingUp} />
        <MetricCard title="Upfront Received" value={`$${metrics.upfrontReceived.toFixed(2)}`} icon={Wallet} />
        <MetricCard title="Order Balances" value={`$${metrics.orderBalances.toFixed(2)}`} icon={Clock} variant="warning" />
        <MetricCard title="Low Stock Items" value={metrics.lowStockItems} icon={Package} variant="warning" />
        <MetricCard title="Pending Deliveries" value={metrics.pendingDeliveries} icon={Truck} />
        <MetricCard
          title="Receivables"
          value={`$${metrics.outstandingReceivables.toFixed(2)}`}
          icon={CreditCard}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> Upfront orders &amp; deadlines</h2>
          <p className="text-xs text-muted-foreground">Countdown to each collection / delivery date.</p>
        </div>

        {upfronts.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No upfront orders recorded yet.</p>

        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Deadline</th><th>Countdown</th><th className="text-right">Order total</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr>
              </thead>
              <tbody>
                {upfronts.map(o => {
                  const cd = countdownTo(o.due_date, now);
                  return (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.receipt_number}</td>
                      <td>{o.client_name ?? 'Walk-in'}{o.client_phone ? ` · ${o.client_phone}` : ''}</td>
                      <td>{o.due_date ? new Date(o.due_date).toLocaleDateString() : 'Not set'}</td>
                      <td className={cd?.overdue ? 'font-semibold text-destructive' : 'font-semibold text-primary'}>
                        {cd ? cd.label : '—'}
                      </td>
                      <td className="text-right">${o.total.toFixed(2)}</td>
                      <td className="text-right">${o.amount_paid.toFixed(2)}</td>
                      <td className="text-right font-semibold">${o.balance_due.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
