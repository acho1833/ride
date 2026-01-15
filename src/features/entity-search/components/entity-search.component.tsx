'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import EntitySearchFormComponent from './entity-search-form.component';
import EntitySearchToolbarComponent from './entity-search-toolbar.component';
import EntitySearchResultsComponent from './entity-search-results.component';
import { useEntitySearchQuery } from '../hooks/useEntitySearchQuery';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT_DIRECTION } from '../const';

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
 * Orchestrates the search form, toolbar (pagination + sort), and results display.
 * Results are only shown after the first search is submitted.
 */
const EntitySearchComponent = ({ pos }: Props) => {
  // All search-related state in single object
  const [search, setSearch] = useState<SearchState>(initialSearchState);

  // Fetch search results (only when hasSearched is true)
  const { data, isPending } = useEntitySearchQuery(
    {
      name: search.name,
      types: search.types.length > 0 ? search.types : undefined,
      sortDirection: search.sortDirection,
      pageSize: DEFAULT_PAGE_SIZE,
      pageNumber: search.pageNumber
    },
    search.hasSearched
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

  return (
    <MainPanelsComponent title="Entity Search" pos={pos}>
      <div className="flex h-full flex-col gap-y-2">
        {/* Search form (always visible) */}
        <EntitySearchFormComponent onSearch={handleSearch} />

        <Separator />

        {/* Results section (only shown after first search) */}
        {search.hasSearched && (
          <>
            {/* Toolbar with pagination and sort (always visible on top of results) */}
            <EntitySearchToolbarComponent
              pageNumber={data?.pageNumber ?? 1}
              pageSize={data?.pageSize ?? DEFAULT_PAGE_SIZE}
              totalCount={data?.totalCount ?? 0}
              sortDirection={search.sortDirection}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
            />

            {/* Results list */}
            <EntitySearchResultsComponent entities={data?.entities ?? []} isLoading={isPending} />
          </>
        )}
      </div>
    </MainPanelsComponent>
  );
};

export default EntitySearchComponent;
