import { forwardRef } from 'react';
import logoAsset from '@/assets/maita-cakes-logo.png.asset.json';
import { useCachedLogo } from '@/lib/offline';
import { STORE_INFO } from '@/components/pos/ThermalReceipt';

export interface RoundReceiptData {
  receiptNumber: string;
  date: Date;
  roundName: string;
  memberName: string;
  memberPhone?: string;
  monthLabel: string;
  monthIndex: number;
  direction: 'in' | 'out';
  amount: number;
  monthlyAmount: number;
  memberCount: number;
  note?: string;
}

const Divider = () => <div className="my-2 border-t border-dashed border-foreground/40" />;

export const RoundReceipt = forwardRef<HTMLDivElement, { data: RoundReceiptData }>(({ data }, ref) => {
  const logoSrc = useCachedLogo(logoAsset.url);

  return (
    <div
      ref={ref}
      className="mx-auto w-[300px] bg-card text-foreground px-4 py-6 font-mono text-[11px] leading-relaxed print:w-[80mm]"
    >
      <div className="flex flex-col items-center text-center">
        <img src={logoSrc} alt="Maita Cakes logo" className="h-28 w-28 object-contain" />
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest">
          {data.direction === 'in' ? 'Round Payout Receipt' : 'Round Contribution Receipt'}
        </p>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Date</span>
        <span>{data.date.toLocaleDateString()}</span>
        <span className="font-bold">Time</span>
        <span>{data.date.toLocaleTimeString()}</span>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Round</span>
        <span className="uppercase">{data.roundName}</span>
        <span className="font-bold">Member</span>
        <span className="uppercase">{data.memberName}</span>
        {data.memberPhone ? (
          <>
            <span className="font-bold">Contact</span>
            <span>{data.memberPhone}</span>
          </>
        ) : null}
        <span className="font-bold">Month</span>
        <span>{data.monthLabel}</span>
        <span className="font-bold">Month No</span>
        <span>{data.monthIndex}</span>
        <span className="font-bold">Members</span>
        <span>{data.memberCount}</span>
        <span className="font-bold">Monthly Contribution</span>
        <span>${data.monthlyAmount.toFixed(2)}</span>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Type</span>
        <span>{data.direction === 'in' ? 'CASH IN (Payout)' : 'CASH OUT (Contribution)'}</span>
        <span className="mt-2 border-t border-foreground/40 pt-1">AMOUNT</span>
        <span className="text-base font-bold">
          {data.direction === 'in' ? '+' : '-'}${data.amount.toFixed(2)}
        </span>
        {data.note ? (
          <>
            <span className="mt-2 font-bold">Note</span>
            <span>{data.note}</span>
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
        <p className="mt-2 text-[10px]">Thank you for keeping the round going.</p>
      </div>
    </div>
  );
});

RoundReceipt.displayName = 'RoundReceipt';
