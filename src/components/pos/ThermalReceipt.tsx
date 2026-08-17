import { forwardRef } from 'react';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { CartItem, PaymentMethod } from '@/types';

export const STORE_INFO = {
  name: 'Maita Cakes',
  tagline: 'Sweet moments on every bite',
  phone: '0785029019',
};

interface ThermalReceiptProps {
  items: CartItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  date: Date;
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  credit: 'Credit',
} as Record<PaymentMethod, string>;

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ items, subtotal, vatAmount, total, paymentMethod, receiptNumber, date }, ref) => {
    return (
      <div
        ref={ref}
        className="mx-auto w-[300px] bg-card text-foreground p-4 font-mono text-[11px] leading-tight print:w-[80mm]"
      >
        <div className="flex flex-col items-center text-center">
          <img
            src={logoAsset.url}
            alt="Maita Cakes logo"
            className="h-24 w-24 object-contain"
          />
          <p className="mt-1 text-sm font-bold tracking-wide">{STORE_INFO.name}</p>
          <p className="text-[10px]">{STORE_INFO.tagline}</p>
          <p className="text-[10px]">Tel: {STORE_INFO.phone}</p>
        </div>

        <div className="my-2 border-t border-dashed border-foreground/40" />

        <div className="flex justify-between">
          <span>Receipt</span>
          <span>#{receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{date.toLocaleString()}</span>
        </div>

        <div className="my-2 border-t border-dashed border-foreground/40" />

        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.product.id}>
              <p className="truncate">{item.product.name}</p>
              <div className="flex justify-between">
                <span>
                  {item.quantity} x ${item.product.sellingPrice.toFixed(2)}
                </span>
                <span>${item.lineTotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-foreground/40" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT (15%)</span>
          <span>${vatAmount.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-foreground/40 pt-1 text-sm font-bold">
          <span>TOTAL</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Paid via</span>
          <span>{paymentLabels[paymentMethod] ?? paymentMethod}</span>
        </div>

        <div className="my-2 border-t border-dashed border-foreground/40" />

        <p className="text-center text-[10px]">Thank you for shopping with us!</p>
        <p className="text-center text-[10px]">{STORE_INFO.phone}</p>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
