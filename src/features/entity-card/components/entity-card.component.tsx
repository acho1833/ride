'use client';

import { useRef } from 'react';
import { Entity } from '@/models/entity.model';
import { Card } from '@/components/ui/card';
import { getEntityIconClass } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ENTITY_ICON_CONFIG } from '@/const';

// Module-level variable to track the currently dragging entity ID.
// Only one drag operation can happen at a time, so this is safe.
let draggingEntityId: string | null = null;

/** Get the ID of the entity currently being dragged (null if none) */
export const getDraggingEntityId = () => draggingEntityId;

interface Props {
  entity: Entity;
  /** Optional CSS classes to override default styles */
  className?: string;
  /** Optional click handler - behavior varies by context (search, graph, etc.) */
  onClick?: (entity: Entity) => void;
  /** Enable drag-and-drop functionality (default: true) */
  draggable?: boolean;
}

/**
 * Reusable entity card component.
 * Displays entity icon (Remix Icon), name, and type in a card layout.
 * Used in entity search results and potentially other areas of the app.
 * Supports drag-and-drop to workspace graphs when draggable is true.
 */
const EntityCardComponent = ({ entity, className, onClick, draggable = true }: Props) => {
  const iconClass = getEntityIconClass(entity.type);
  const dragImageRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!draggable) return;

    // Track dragging entity ID for drop targets to check existence
    draggingEntityId = entity.id;

    // Set entity data for drop target
    event.dataTransfer.setData('application/json', JSON.stringify(entity));
    event.dataTransfer.effectAllowed = 'copy';

    // Use custom drag image
    if (dragImageRef.current) {
      event.dataTransfer.setDragImage(dragImageRef.current, 20, 20);
    }
  };

  const handleDragEnd = () => {
    // Clear dragging entity ID when drag ends
    draggingEntityId = null;
  };

  // Get icon symbol id for SVG reference
  const iconSymbolId = entity.type in ENTITY_ICON_CONFIG ? entity.type : 'unknown';

  return (
    <>
      <Card
        className={cn('hover:bg-accent cursor-pointer overflow-hidden p-2', className)}
        onClick={() => onClick?.(entity)}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Header: icon + name */}
        <div className="flex min-w-0 items-center gap-x-2 border-b pb-1">
          <i className={cn('text-muted-foreground flex-shrink-0 text-base', iconClass)} />
          <span className="min-w-0 truncate font-medium">{entity.labelNormalized}</span>
        </div>

        {/* Content area (for future details) */}
        <div className="min-h-12" />
      </Card>

      {/* Hidden drag image: blue circle with entity icon */}
      {draggable && (
        <div ref={dragImageRef} className="pointer-events-none fixed -top-[9999px] -left-[9999px]">
          <svg width="40" height="40">
            <circle cx="20" cy="20" r="20" fill="hsl(210, 70%, 50%)" />
            <use href={`#entity-icon-${iconSymbolId}`} x="4" y="4" width="32" height="32" fill="white" />
          </svg>
        </div>
      )}
    </>
  );
};

export default EntityCardComponent;
