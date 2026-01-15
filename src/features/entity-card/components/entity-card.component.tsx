'use client';

import { Entity } from '@/models/entity.model';
import { Card } from '@/components/ui/card';
import { getEntityIconClass } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  entity: Entity;
  /** Optional CSS classes to override default styles */
  className?: string;
  /** Optional click handler - behavior varies by context (search, graph, etc.) */
  onClick?: (entity: Entity) => void;
}

/**
 * Reusable entity card component.
 * Displays entity icon (Remix Icon), name, and type in a card layout.
 * Used in entity search results and potentially other areas of the app.
 */
const EntityCardComponent = ({ entity, className, onClick }: Props) => {
  const iconClass = getEntityIconClass(entity.type);

  return (
    <Card className={cn('hover:bg-accent cursor-pointer p-2', className)} onClick={() => onClick?.(entity)}>
      {/* Header: icon + name */}
      <div className="flex items-center gap-x-2 border-b pb-1">
        <i className={cn('text-muted-foreground flex-shrink-0 text-base', iconClass)} />
        <span className="truncate font-medium">{entity.labelNormalized}</span>
      </div>

      {/* Content area (for future details) */}
      <div className="min-h-12" />
    </Card>
  );
};

export default EntityCardComponent;
