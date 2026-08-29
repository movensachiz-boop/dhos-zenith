import { forwardRef } from 'react';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { useCachedLogo } from '@/lib/offline';
import { STORE_INFO } from '@/components/pos/ThermalReceipt';

export interface BillReceiptData {
  receiptNumber: string;
  date: Date;
  title: string;
  category: string;
  vendor?: string;
  amount: number;
  paymentMethod: string;
  paidOn: string;
  notes?: string;
}

const Divider = () => <div className="my-2 border-t border-dashed border-foreground/40" />;

export const BillReceipt = forwardRef<HTMLDivElement, { data: BillReceiptData }>(({ data }, ref) => {
  const logoSrc = useCachedLogo(logoAsset.url);

  return (
    <div
      ref={ref}
      className="mx-auto w-[300px] bg-card text-foreground px-4 py-6 font-mono text-[11px] leading-relaxed print:w-[80mm]"
    >
      <div className="flex flex-col items-center text-center">
        <img src={logoSrc} alt="Maita Cakes logo" className="h-28 w-28 object-contain" />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest">Bill Payment Receipt</p>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Date</span>
        <span>{data.date.toLocaleDateString()}</span>
        <span className="font-bold">Time</span>
        <span>{data.date.toLocaleTimeString()}</span>
        <span className="font-bold">Paid On</span>
        <span>{data.paidOn}</span>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Bill</span>
        <span className="uppercase">{data.title}</span>
        <span className="font-bold">Category</span>
        <span className="uppercase">{data.category}</span>
        {data.vendor ? (
          <>
            <span className="font-bold">Paid To</span>
            <span className="uppercase">{data.vendor}</span>
          </>
        ) : null}
        <span className="font-bold">Payment Method</span>
        <span className="uppercase">{data.paymentMethod.replace(/_/g, ' ')}</span>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="mt-1 border-t border-foreground/40 pt-1 font-bold">AMOUNT PAID</span>
        <span className="text-base font-bold">-${Number(data.amount).toFixed(2)}</span>
        {data.notes ? (
          <>
            <span className="mt-2 font-bold">Note</span>
            <span>{data.notes}</span>
          </>
        ) : null}
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-sm font-bold tracking-wide">{STORE_INFO.name}</p>
        <p className="text-[10px]">{STORE_INFO.tagline}</p>
        <p className="text-[10px]">Tel: {STORE_INFO.phone}</p>
        <p className="mt-2 text-[11px] font-bold">RECEIPT NO</p>
        <p className="text-sm font-bold">{data.receiptNumber}</p>
        <p className="mt-2 text-[10px]">Keep this receipt for your records.</p>
      </div>
    </div>
  );
});

BillReceipt.displayName = 'BillReceipt';
