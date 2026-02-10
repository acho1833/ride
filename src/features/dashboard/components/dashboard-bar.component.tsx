'use client';

import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number;
  maxValue: number;
  className?: string;
}

const DashboardBarComponent = ({ label, value, maxValue, className }: Props) => {
  const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <span className="text-muted-foreground w-28 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="bg-muted h-3.5 flex-1 overflow-hidden rounded-sm">
        <div
          className="bg-primary h-full rounded-sm transition-all"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="text-muted-foreground w-8 shrink-0 text-right font-mono">{value}</span>
    </div>
  );
};

export default DashboardBarComponent;
