'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

/** Data passed to custom edge by React Flow */
interface PatternEdgeData {
  predicates: string[];
  selected: boolean;
}

interface Props {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: PatternEdgeData;
  markerEnd?: string;
}

/**
 * Custom React Flow edge for pattern builder.
 * Displays arrow with predicate label and selection state.
 */
const PatternEdgeComponent = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }: Props) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  // Build label text
  const labelText =
    data?.predicates && data.predicates.length > 0
      ? data.predicates.length === 1
        ? data.predicates[0]
        : `${data.predicates.length} predicates`
      : 'Any';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={cn('!stroke-2', data?.selected ? '!stroke-primary' : '!stroke-muted-foreground')}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            'nodrag nopan bg-background border-border absolute rounded border px-1.5 py-0.5 text-xs',
            data?.selected && 'border-primary text-primary'
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
        >
          {labelText}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(PatternEdgeComponent);
