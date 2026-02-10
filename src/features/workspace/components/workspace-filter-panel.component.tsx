'use client';

import { Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getEntityIconClass } from '@/lib/utils';

interface Props {
  entityTypes: string[];
  predicates: string[];
  hiddenEntityTypes: string[];
  hiddenPredicates: string[];
  onToggleEntityType: (entityType: string) => void;
  onTogglePredicate: (predicate: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const MAX_SECTION_HEIGHT = 160;

const WorkspaceFilterPanelComponent = ({
  entityTypes,
  predicates,
  hiddenEntityTypes,
  hiddenPredicates,
  onToggleEntityType,
  onTogglePredicate,
  onReset,
  onClose
}: Props) => {
  const hasActiveFilters = hiddenEntityTypes.length > 0 || hiddenPredicates.length > 0;

  return (
    <div className="bg-background/90 absolute top-0 right-0 z-10 flex max-h-[calc(100%-11rem)] w-52 flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Filters</span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {/* Entity Types Section */}
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase">Entity Types</span>
          <ScrollArea style={{ maxHeight: MAX_SECTION_HEIGHT }}>
            <div className="flex flex-col gap-0.5">
              {entityTypes.map(type => {
                const isHidden = hiddenEntityTypes.includes(type);
                return (
                  <button
                    key={type}
                    className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors"
                    onClick={() => onToggleEntityType(type)}
                  >
                    {isHidden ? (
                      <EyeOff className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <i className={`${getEntityIconClass(type)} text-xs`} />
                    <span className={isHidden ? 'text-muted-foreground line-through' : ''}>{type}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Relationships Section */}
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase">Relationships</span>
          <ScrollArea style={{ maxHeight: MAX_SECTION_HEIGHT }}>
            <div className="flex flex-col gap-0.5">
              {predicates.map(predicate => {
                const isHidden = hiddenPredicates.includes(predicate);
                return (
                  <button
                    key={predicate}
                    className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors"
                    onClick={() => onTogglePredicate(predicate)}
                  >
                    {isHidden ? (
                      <EyeOff className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className={isHidden ? 'text-muted-foreground line-through' : ''}>{predicate.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      {hasActiveFilters && (
        <div className="border-t px-3 py-2">
          <Button variant="ghost" size="sm" className="h-6 w-full text-xs" onClick={onReset}>
            Reset All
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceFilterPanelComponent;
