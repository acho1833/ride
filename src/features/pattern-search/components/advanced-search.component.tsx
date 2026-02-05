'use client';

import { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import PatternBuilderComponent from './pattern-builder.component';
import PatternResultsComponent from './pattern-results.component';
import { usePatternSearchMutation } from '../hooks/usePatternSearchMutation';
import { usePatternNodes, usePatternEdges } from '@/stores/pattern-search/pattern-search.selector';
import { DEFAULT_PATTERN_PAGE_SIZE } from '../const';
import type { PatternSearchResponse } from '../types';

/**
 * Advanced search component combining pattern builder and results.
 * Manages search execution and result pagination.
 */
const AdvancedSearchComponent = () => {
  const [searchResults, setSearchResults] = useState<PatternSearchResponse | null>(null);

  // Get pattern from store
  const nodes = usePatternNodes();
  const edges = usePatternEdges();

  // Search mutation
  const { mutate: search, isPending } = usePatternSearchMutation();

  // Execute search
  const handleSearch = () => {
    search(
      {
        pattern: { nodes, edges },
        pageSize: DEFAULT_PATTERN_PAGE_SIZE,
        pageNumber: 1
      },
      {
        onSuccess: data => {
          setSearchResults(data);
        }
      }
    );
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    search(
      {
        pattern: { nodes, edges },
        pageSize: DEFAULT_PATTERN_PAGE_SIZE,
        pageNumber: page
      },
      {
        onSuccess: data => {
          setSearchResults(data);
        }
      }
    );
  };

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
      {/* Pattern Builder */}
      <ResizablePanel defaultSize={60} minSize={20}>
        <div className="flex h-full flex-col">
          <PatternBuilderComponent onSearch={handleSearch} isSearching={isPending} />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Results */}
      <ResizablePanel defaultSize={40} minSize={15}>
        <div className="flex h-full flex-col pt-2">
          <PatternResultsComponent data={searchResults} isLoading={isPending} onPageChange={handlePageChange} />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AdvancedSearchComponent;
