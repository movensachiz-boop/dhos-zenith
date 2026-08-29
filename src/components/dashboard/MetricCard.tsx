import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'success';
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="font-normal text-muted-foreground">vs yesterday</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          variant === 'primary' && "bg-primary/10 text-primary",
          variant === 'warning' && "bg-warning/10 text-warning",
          variant === 'success' && "bg-success/10 text-success",
          variant === 'default' && "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
