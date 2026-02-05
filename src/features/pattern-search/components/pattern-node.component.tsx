'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn, getEntityIconClass } from '@/lib/utils';

/** Data passed to custom node by React Flow */
interface PatternNodeData {
  label: string;
  type: string | null;
  filters: Array<{ attribute: string; patterns: string[] }>;
  selected: boolean;
}

interface Props {
  data: PatternNodeData;
}

/**
 * Custom React Flow node for pattern builder.
 * Displays entity type icon, label, and filter summary.
 * Has input/output handles for creating connections.
 */
const PatternNodeComponent = ({ data }: Props) => {
  const iconClass = data.type ? getEntityIconClass(data.type) : 'ri-question-line';

  // Build filter summary text
  const filterSummary = data.filters.length > 0 ? `${data.filters.length} filter(s)` : null;

  return (
    <div
      className={cn(
        'bg-card border-border flex min-w-[120px] flex-col items-center rounded-lg border-2 p-2 shadow-sm',
        data.selected && 'border-primary ring-primary/20 ring-2'
      )}
    >
      {/* Input handle (left side) */}
      <Handle type="target" position={Position.Left} className="!bg-primary !h-3 !w-3" />

      {/* Entity icon */}
      <div className="bg-muted mb-1 flex h-10 w-10 items-center justify-center rounded">
        <i className={cn('text-muted-foreground text-xl', iconClass)} />
      </div>

      {/* Node label */}
      <div className="text-sm font-medium">{data.label}</div>

      {/* Type badge */}
      <div className="text-muted-foreground text-xs">{data.type ?? 'Any Type'}</div>

      {/* Filter summary */}
      {filterSummary && <div className="text-muted-foreground mt-1 text-xs italic">{filterSummary}</div>}

      {/* Output handle (right side) */}
      <Handle type="source" position={Position.Right} className="!bg-primary !h-3 !w-3" />
    </div>
  );
};

export default memo(PatternNodeComponent);
