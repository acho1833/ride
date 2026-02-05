'use client';

import { useState } from 'react';
import { cn, getEntityIconClass } from '@/lib/utils';
import type { PatternMatch } from '../types';
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import EntityCardComponent from '@/features/entity-card/components/entity-card.component';

interface Props {
  match: PatternMatch;
}

/**
 * Displays a single pattern match as a compact horizontal chain.
 * Shows: [icon] Name —predicate→ [icon] Name —predicate→ ...
 * Expandable to show entity cards for drag-and-drop.
 */
const PatternMatchRowComponent = ({ match }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { entities, relationships } = match;

  // Build relationship map for quick lookup
  const relationshipMap = new Map<string, { predicate: string; isForward: boolean }>();
  for (const rel of relationships) {
    relationshipMap.set(`${rel.sourceEntityId}-${rel.relatedEntityId}`, {
      predicate: rel.predicate,
      isForward: true
    });
    relationshipMap.set(`${rel.relatedEntityId}-${rel.sourceEntityId}`, {
      predicate: rel.predicate,
      isForward: false
    });
  }

  return (
    <div className="bg-card rounded-lg border transition-colors">
      {/* Collapsed row - clickable to expand */}
      <div className="hover:bg-muted/50 flex cursor-pointer items-center gap-x-1 px-3 py-2" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Expand/collapse indicator */}
        <ChevronDownIcon className={cn('text-muted-foreground mr-1 h-4 w-4 transition-transform', !isExpanded && '-rotate-90')} />

        {/* Entity chain */}
        {entities.map((entity, index) => {
          const iconClass = getEntityIconClass(entity.type);

          // Get relationship to next entity
          const nextEntity = entities[index + 1];
          const relationshipInfo = nextEntity ? (relationshipMap.get(`${entity.id}-${nextEntity.id}`) ?? null) : null;

          return (
            <div key={entity.id} className="flex items-center">
              {/* Entity chip */}
              <div className="bg-muted/50 flex items-center gap-x-1.5 rounded-md px-2 py-1">
                <i className={cn('text-muted-foreground text-sm', iconClass)} />
                <span className="max-w-[120px] truncate text-xs font-medium">{entity.labelNormalized}</span>
              </div>

              {/* Connector arrow with predicate */}
              {relationshipInfo && (
                <div className="flex items-center px-1">
                  <div
                    className={cn(
                      'text-muted-foreground flex items-center gap-x-0.5 text-[10px]',
                      !relationshipInfo.isForward && 'flex-row-reverse'
                    )}
                  >
                    <span className="text-muted-foreground/70 italic">{relationshipInfo.predicate}</span>
                    <ChevronRightIcon className={cn('h-3 w-3', !relationshipInfo.isForward && 'rotate-180')} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded view - entity cards */}
      {isExpanded && (
        <div className="border-t px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {entities.map(entity => (
              <EntityCardComponent key={entity.id} entity={entity} className="w-40" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternMatchRowComponent;
