import { Product, Transaction, Client, Supplier, Category, DashboardMetrics } from '@/types';

export const mockCategories: Category[] = [];

export const mockProducts: Product[] = [];

export const mockClients: Client[] = [];

export const mockSuppliers: Supplier[] = [];

export const mockDashboardMetrics: DashboardMetrics = {
  todaySales: 0,
  todayTransactions: 0,
  averageOrderValue: 0,
  lowStockItems: 0,
  pendingDeliveries: 0,
  outstandingReceivables: 0,
};

export const mockRecentTransactions: Transaction[] = [];
