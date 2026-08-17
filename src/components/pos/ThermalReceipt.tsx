import { forwardRef } from 'react';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { useCachedLogo } from '@/lib/offline';
import { CartItem, PaymentMethod } from '@/types';

export const STORE_INFO = {
  name: 'Maita Cakes',
  tagline: 'Sweet moments on every bite',
  phone: '0785029019',
};

interface ThermalReceiptProps {
  items: CartItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  date: Date;
  docType?: 'sale' | 'order';
  customerName?: string;
  customerPhone?: string;
  customerNumber?: string;
  referralCode?: string;
  offline?: boolean;
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  split: 'Split Payment',
};

const Divider = () => <div className="my-2 border-t border-dashed border-foreground/40" />;

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  (
    {
      items,
      subtotal,
      discount = 0,
      total,
      paymentMethod,
      receiptNumber,
      date,
      docType = 'sale',
      customerName,
      customerPhone,
      customerNumber,
      referralCode,
      offline,
    },
    ref
  ) => {
    const logoSrc = useCachedLogo(logoAsset.url);

    return (
      <div
        ref={ref}
        className="mx-auto w-[300px] bg-card text-foreground px-4 py-6 font-mono text-[11px] leading-relaxed print:w-[80mm]"
      >
        {/* Logo on top */}
        <div className="flex flex-col items-center text-center">
          <img src={logoSrc} alt="Maita Cakes logo" className="h-28 w-28 object-contain" />
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest">
            {docType === 'order' ? 'Order Receipt' : 'Sale Receipt'}
          </p>
        </div>

        <Divider />

        {/* Date + items, one per line, portrait */}
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">Date</span>
          <span>{date.toLocaleString()}</span>
        </div>

        <Divider />

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.product.id} className="flex flex-col">
              <span className="font-bold uppercase">{item.product.name}</span>
              <span>Qty: {item.quantity}</span>
              <span>Unit: ${item.product.sellingPrice.toFixed(2)}</span>
              <span>Amount: ${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Divider />

        <div className="flex flex-col gap-0.5">
          <span>Subtotal</span>
          <span className="text-sm font-bold">${subtotal.toFixed(2)}</span>
          {discount > 0 ? (
            <>
              <span className="mt-1">Referral Discount</span>
              <span className="text-sm font-bold">-${discount.toFixed(2)}</span>
            </>
          ) : null}
          <span className="mt-2 border-t border-foreground/40 pt-1">TOTAL</span>
          <span className="text-base font-bold">${total.toFixed(2)}</span>
          <span className="mt-2">{docType === 'order' ? 'Payment' : 'Paid via'}</span>
          <span className="font-bold">{paymentLabels[paymentMethod] ?? paymentMethod}</span>
        </div>

        <Divider />

        {/* Customer block */}
        <div className="flex flex-col gap-0.5">
          <span className="font-bold uppercase">Customer</span>
          <span>{customerName || 'Walk-in'}</span>
          {customerPhone ? <span>{customerPhone}</span> : null}
          {customerNumber ? <span>Customer No: {customerNumber}</span> : null}
          {referralCode ? <span>Referred by: {referralCode}</span> : null}
        </div>

        <Divider />

        {/* Bottom block: name, phone, order number, thanks */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm font-bold tracking-wide">{STORE_INFO.name}</p>
          <p className="text-[10px]">{STORE_INFO.tagline}</p>
          <p className="text-[10px]">Tel: {STORE_INFO.phone}</p>
          <p className="mt-2 text-[11px] font-bold">
            {docType === 'order' ? 'ORDER NO' : 'RECEIPT NO'}
          </p>
          <p className="text-sm font-bold">{receiptNumber}</p>
          <p className="mt-2 text-[10px]">
            {docType === 'order' ? 'Order confirmed. Thank you!' : 'Thank you for shopping with us!'}
          </p>
          <p className="text-[10px]">Refer a friend with your Customer No and earn a discount.</p>
          {offline ? <p className="mt-1 text-[10px]">* Offline copy - will sync *</p> : null}
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
