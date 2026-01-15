'use client';

import { Entity } from '@/models/entity.model';
import EntityCardComponent from '@/features/entity-card/components/entity-card.component';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  entities: Entity[];
  isLoading: boolean;
}

/**
 * Displays entity search results as a scrollable list of cards.
 * Handles loading and empty states.
 */
const EntitySearchResultsComponent = ({ entities, isLoading }: Props) => {
  // Loading state
  if (isLoading) {
    return <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">Loading...</div>;
  }

  // Empty state
  if (entities.length === 0) {
    return <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">No results found</div>;
  }

  // Results list
  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-y-1 pr-2">
        {entities.map(entity => (
          <EntityCardComponent key={entity.id} entity={entity} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default EntitySearchResultsComponent;
