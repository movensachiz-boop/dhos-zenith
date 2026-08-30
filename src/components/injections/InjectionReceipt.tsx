import { forwardRef } from 'react';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { useCachedLogo } from '@/lib/offline';
import { STORE_INFO } from '@/components/pos/ThermalReceipt';

export interface InjectionReceiptData {
  kind: 'injection' | 'repayment';
  receiptNumber: string;
  date: Date;
  source: string;
  amount: number;
  paymentMethod?: string;
  paidOn?: string;
  totalDebt?: number;
  totalRepaid?: number;
  outstanding?: number;
  notes?: string;
}

const Divider = () => <div className="my-2 border-t border-dashed border-foreground/40" />;

export const InjectionReceipt = forwardRef<HTMLDivElement, { data: InjectionReceiptData }>(({ data }, ref) => {
  const logoSrc = useCachedLogo(logoAsset.url);
  const isRepayment = data.kind === 'repayment';

  return (
    <div
      ref={ref}
      className="mx-auto w-[300px] bg-card text-foreground px-4 py-6 font-mono text-[11px] leading-relaxed print:w-[80mm]"
    >
      <div className="flex flex-col items-center text-center">
        <img src={logoSrc} alt="Maita Cakes logo" className="h-28 w-28 object-contain" />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest">
          {isRepayment ? 'Debt Repayment Receipt' : 'Money Injection Receipt'}
        </p>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Date</span>
        <span>{data.date.toLocaleDateString()}</span>
        <span className="font-bold">Time</span>
        <span>{data.date.toLocaleTimeString()}</span>
        {data.paidOn ? (
          <>
            <span className="font-bold">{isRepayment ? 'Paid On' : 'Received On'}</span>
            <span>{data.paidOn}</span>
          </>
        ) : null}
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">{isRepayment ? 'Paid To' : 'Received From'}</span>
        <span className="uppercase">{data.source}</span>
        {data.paymentMethod ? (
          <>
            <span className="font-bold">Payment Method</span>
            <span className="uppercase">{data.paymentMethod.replace(/_/g, ' ')}</span>
          </>
        ) : null}
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="mt-1 border-t border-foreground/40 pt-1 font-bold">
          {isRepayment ? 'AMOUNT REPAID' : 'AMOUNT INJECTED'}
        </span>
        <span className="text-base font-bold">
          {isRepayment ? '-' : '+'}${Number(data.amount).toFixed(2)}
        </span>

        {typeof data.totalDebt === 'number' ? (
          <>
            <span className="mt-2 font-bold">Total Debt</span>
            <span>${data.totalDebt.toFixed(2)}</span>
          </>
        ) : null}
        {typeof data.totalRepaid === 'number' ? (
          <>
            <span className="font-bold">Total Repaid</span>
            <span>${data.totalRepaid.toFixed(2)}</span>
          </>
        ) : null}
        {typeof data.outstanding === 'number' ? (
          <>
            <span className="font-bold">Balance Owing</span>
            <span className="text-base font-bold">${data.outstanding.toFixed(2)}</span>
            <span className="font-bold">Status</span>
            <span className="uppercase">{data.outstanding <= 0.009 ? 'FULLY PAID' : 'OUTSTANDING DEBT'}</span>
          </>
        ) : null}

        {data.notes ? (
          <>
            <span className="mt-2 font-bold">Note</span>
            <span>{data.notes}</span>
          </>
        ) : null}
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[10px]">
          {isRepayment
            ? 'This payment reduces the money owed. Not a business expense.'
            : 'This money is a debt to be repaid. It is not business profit.'}
        </p>
        <p className="mt-2 text-sm font-bold tracking-wide">{STORE_INFO.name}</p>
        <p className="text-[10px]">{STORE_INFO.tagline}</p>
        <p className="text-[10px]">Tel: {STORE_INFO.phone}</p>
        <p className="mt-2 text-[11px] font-bold">RECEIPT NO</p>
        <p className="text-sm font-bold">{data.receiptNumber}</p>
      </div>
    </div>
  );
});

InjectionReceipt.displayName = 'InjectionReceipt';
