'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { cn } from '@/lib/utils';
import { ADVANCED_SEARCH_MIN_WIDTH } from '@/features/pattern-search/const';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import EntitySearchFormComponent from './entity-search-form.component';
import EntitySearchToolbarComponent from './entity-search-toolbar.component';
import EntitySearchResultsComponent from './entity-search-results.component';
import AdvancedSearchComponent from '@/features/pattern-search/components/advanced-search.component';
import { useEntitySearchQuery } from '../hooks/useEntitySearchQuery';
import { useSearchMode, usePatternSearchActions } from '@/stores/pattern-search/pattern-search.selector';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT_DIRECTION } from '../const';
import type { SearchMode } from '@/features/pattern-search/types';

interface Props {
  pos: ToolbarPositions;
}

/** Search parameters state - combined into single object for cleaner state management */
interface SearchState {
  name: string;
  types: string[];
  pageNumber: number;
  sortDirection: 'asc' | 'desc';
  hasSearched: boolean;
}

const initialSearchState: SearchState = {
  name: '',
  types: [],
  pageNumber: 1,
  sortDirection: DEFAULT_SORT_DIRECTION,
  hasSearched: false
};

/**
 * Main entity search component.
 * Orchestrates simple search (form + results) and advanced search (pattern builder).
 * Mode toggle switches between Simple and Advanced views.
 */
const EntitySearchComponent = ({ pos }: Props) => {
  // All search-related state in single object (for simple mode)
  const [search, setSearch] = useState<SearchState>(initialSearchState);

  // Search mode from store
  const mode = useSearchMode();
  const { setSearchMode } = usePatternSearchActions();

  // Fetch search results (only when hasSearched is true, only for simple mode)
  const { data, isPending } = useEntitySearchQuery(
    {
      name: search.name,
      types: search.types.length > 0 ? search.types : undefined,
      sortDirection: search.sortDirection,
      pageSize: DEFAULT_PAGE_SIZE,
      pageNumber: search.pageNumber
    },
    search.hasSearched && mode === 'simple'
  );

  // Handle form submission - update search params and reset to page 1
  const handleSearch = (name: string, types: string[]) => {
    setSearch(prev => ({
      ...prev,
      name,
      types,
      pageNumber: 1,
      hasSearched: true
    }));
  };

  // Handle pagination - update page number (triggers refetch)
  const handlePageChange = (page: number) => {
    setSearch(prev => ({ ...prev, pageNumber: page }));
  };

  // Handle sort direction change - reset to page 1 when sorting changes
  const handleSortChange = (direction: 'asc' | 'desc') => {
    setSearch(prev => ({ ...prev, sortDirection: direction, pageNumber: 1 }));
  };

  // Handle mode change
  const handleModeChange = (value: string) => {
    setSearchMode(value as SearchMode);
  };

  return (
    <MainPanelsComponent title="Entity Search" pos={pos} focusPanelType="entity-search">
      <div className={cn('flex h-full flex-col gap-y-2', mode === 'advanced' && ADVANCED_SEARCH_MIN_WIDTH)}>
        {/* Mode toggle */}
        <RadioGroup value={mode} onValueChange={handleModeChange} className="flex gap-x-4">
          <div className="flex items-center gap-x-1">
            <RadioGroupItem value="simple" id="mode-simple" />
            <Label htmlFor="mode-simple" className="cursor-pointer text-xs">
              Simple
            </Label>
          </div>
          <div className="flex items-center gap-x-1">
            <RadioGroupItem value="advanced" id="mode-advanced" />
            <Label htmlFor="mode-advanced" className="cursor-pointer text-xs">
              Advanced
            </Label>
          </div>
        </RadioGroup>

        <Separator />

        {/* Simple mode: existing search UI */}
        {mode === 'simple' && (
          <>
            <EntitySearchFormComponent onSearch={handleSearch} />

            <Separator />

            {/* Results section (only shown after first search) */}
            {search.hasSearched && (
              <div className="flex min-h-0 flex-1 flex-col gap-y-2">
                <EntitySearchToolbarComponent
                  pageNumber={data?.pageNumber ?? 1}
                  pageSize={data?.pageSize ?? DEFAULT_PAGE_SIZE}
                  totalCount={data?.totalCount ?? 0}
                  sortDirection={search.sortDirection}
                  onPageChange={handlePageChange}
                  onSortChange={handleSortChange}
                />
                <EntitySearchResultsComponent entities={data?.entities ?? []} isLoading={isPending} />
              </div>
            )}
          </>
        )}

        {/* Advanced mode: pattern builder */}
        {mode === 'advanced' && <AdvancedSearchComponent />}
      </div>
    </MainPanelsComponent>
  );
};

export default EntitySearchComponent;
