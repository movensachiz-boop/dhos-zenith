// Core Types for DreamHunters Operations System

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  vatApplicable: boolean;
  unitOfMeasure: string;
  stockTrackingEnabled: boolean;
  currentStock: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  items: CartItem[];
  subtotal: number;
  vatAmount: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentBreakdown?: PaymentBreakdown;
  cashierId: string;
  cashierName: string;
  clientId?: string;
  clientName?: string;
  status: TransactionStatus;
  createdAt: Date;
  currency: Currency;
}

export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'split';

export interface PaymentBreakdown {
  cash?: number;
  mobileMoney?: number;
  bankTransfer?: number;
}

export type TransactionStatus = 'completed' | 'voided' | 'refunded';

export type Currency = 'USD' | 'ZWL';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tinNumber?: string;
  creditLimit: number;
  outstandingBalance: number;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  products: string[];
  createdAt: Date;
}

export interface Transporter {
  id: string;
  name: string;
  vehicleNumber?: string;
  driverName?: string;
  phone?: string;
  status: TransporterStatus;
}

export type TransporterStatus = 'available' | 'in_transit' | 'offline';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export type UserRole = 'super_admin' | 'admin' | 'cashier' | 'operations_manager' | 'accountant' | 'auditor';

export interface DashboardMetrics {
  todaySales: number;
  todayTransactions: number;
  averageOrderValue: number;
  lowStockItems: number;
  pendingDeliveries: number;
  outstandingReceivables: number;
  upfrontReceived: number;
  orderBalances: number;
}

export interface Category {
  id: string;
  name: string;
  productCount: number;
}
