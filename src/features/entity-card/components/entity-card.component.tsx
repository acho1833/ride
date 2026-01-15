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
    <Card className={cn('hover:bg-accent flex cursor-pointer items-center gap-x-2 p-2', className)} onClick={() => onClick?.(entity)}>
      {/* Entity type icon (Remix Icon) */}
      <i className={cn('text-muted-foreground flex-shrink-0 text-base', iconClass)} />

      {/* Entity info */}
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-sm">{entity.labelNormalized}</span>
        <span className="text-muted-foreground text-xs">{entity.type}</span>
      </div>
    </Card>
  );
};

export default EntityCardComponent;
