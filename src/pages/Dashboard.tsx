import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Truck, 
  CreditCard 
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { mockDashboardMetrics, mockRecentTransactions, mockProducts } from '@/data/mockData';

export default function Dashboard() {
  const metrics = mockDashboardMetrics;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Today's Sales"
          value={`$${metrics.todaySales.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
          variant="primary"
        />
        <MetricCard
          title="Transactions"
          value={metrics.todayTransactions}
          icon={ShoppingCart}
          trend={{ value: 8.2, isPositive: true }}
        />
        <MetricCard
          title="Avg Order Value"
          value={`$${metrics.averageOrderValue.toFixed(2)}`}
          icon={TrendingUp}
          trend={{ value: 3.1, isPositive: true }}
        />
        <MetricCard
          title="Low Stock Items"
          value={metrics.lowStockItems}
          icon={Package}
          variant="warning"
        />
        <MetricCard
          title="Pending Deliveries"
          value={metrics.pendingDeliveries}
          icon={Truck}
        />
        <MetricCard
          title="Receivables"
          value={`$${metrics.outstandingReceivables.toLocaleString()}`}
          icon={CreditCard}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentTransactions transactions={mockRecentTransactions} />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <QuickActions />
          <LowStockAlert products={mockProducts} />
        </div>
      </div>
    </div>
  );
}
