import { Transaction } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const paymentMethodLabels = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  split: 'Split Payment',
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-6 border-b">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>
      <div className="divide-y">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold",
                transaction.status === 'completed' && "bg-success/10 text-success",
                transaction.status === 'voided' && "bg-destructive/10 text-destructive",
                transaction.status === 'refunded' && "bg-warning/10 text-warning"
              )}>
                {transaction.currency}
              </div>
              <div>
                <p className="font-medium">{transaction.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.clientName || 'Walk-in Customer'} • {paymentMethodLabels[transaction.paymentMethod]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">${transaction.total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {format(transaction.createdAt, 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
