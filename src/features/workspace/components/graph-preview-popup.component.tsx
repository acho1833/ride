'use client';

/**
 * Graph Preview Popup Component
 *
 * Shows paginated list of entities for a grouped preview.
 * Uses DetailPopupComponent for consistent styling and drag behavior.
 * Uses compact EntityCard variant with drag support.
 * Position is stored in SVG coordinates and moves with pan/zoom.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DetailPopupComponent from './detail-popup.component';
import EntityCardComponent from '@/features/entity-card/components/entity-card.component';
import type { Entity } from '@/models/entity.model';
import { getEntityIconClass } from '@/lib/utils';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface Props {
  entityType: string;
  entities: Entity[];
  entitiesInGraph: Set<string>;
  /** Screen x coordinate for popup position (converted from SVG coords) */
  x: number;
  /** Screen y coordinate for popup position (converted from SVG coords) */
  y: number;
  onAdd: (entity: Entity) => void;
  onClose: () => void;
  onDragEnd: (containerX: number, containerY: number) => void;
}

const GraphPreviewPopupComponent = ({ entityType, entities, entitiesInGraph, x, y, onAdd, onClose, onDragEnd }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const iconClass = getEntityIconClass(entityType);

  // Filter entities by search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(e => e.labelNormalized.toLowerCase().includes(query));
  }, [entities, searchQuery]);

  // Paginate
  const totalPages = Math.ceil(filteredEntities.length / PAGE_SIZE);
  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntities.slice(start, start + PAGE_SIZE);
  }, [filteredEntities, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const header = (
    <div className="flex items-center gap-1.5">
      <i className={cn('text-muted-foreground text-sm', iconClass)} />
      <span className="truncate text-sm font-medium">
        {entityType} ({entities.length})
      </span>
    </div>
  );

  return (
    <DetailPopupComponent x={x} y={y} onClose={onClose} onDragEnd={onDragEnd} header={header}>
      {/* Search */}
      <div className="pb-2">
        <Input
          type="text"
          placeholder={`Search ${entityType.toLowerCase()}...`}
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          className="h-7 text-xs"
        />
      </div>

      {/* Entity list */}
      <div className="max-h-48 overflow-y-auto">
        {paginatedEntities.length === 0 ? (
          <div className="text-muted-foreground py-2 text-center text-xs">No entities found</div>
        ) : (
          <div className="-mx-1">
            {paginatedEntities.map(entity => {
              const isInGraph = entitiesInGraph.has(entity.id);
              return (
                <EntityCardComponent
                  key={entity.id}
                  entity={entity}
                  variant="compact"
                  draggable={!isInGraph}
                  disabled={isInGraph}
                  onClick={() => !isInGraph && onAdd(entity)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t pt-2">
          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            <i className="ri-arrow-left-s-line text-xs" />
          </Button>
          <span className="text-muted-foreground text-xs">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <i className="ri-arrow-right-s-line text-xs" />
          </Button>
        </div>
      )}
    </DetailPopupComponent>
  );
};

export default GraphPreviewPopupComponent;
