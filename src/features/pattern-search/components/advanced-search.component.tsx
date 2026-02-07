'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import PatternBuilderComponent from './pattern-builder.component';
import PatternResultsComponent from './pattern-results.component';
import { usePatternSearchMutation } from '../hooks/usePatternSearchMutation';
import { useSort } from '../hooks/useSort';
import {
  usePatternNodes,
  usePatternEdges,
  useIsPatternComplete,
  usePatternIncompleteReason
} from '@/stores/pattern-search/pattern-search.selector';
import { DEFAULT_PATTERN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../const';
import type { PatternSearchResponse } from '../types';

/**
 * Advanced search component combining pattern builder and results.
 * Automatically searches when pattern is complete (debounced).
 */
const AdvancedSearchComponent = () => {
  const [searchResults, setSearchResults] = useState<PatternSearchResponse | null>(null);

  // Get pattern from store
  const nodes = usePatternNodes();
  const edges = usePatternEdges();
  const isComplete = useIsPatternComplete();
  const incompleteReason = usePatternIncompleteReason();

  // Sort state
  const { sortState, setAttribute, toggleDirection } = useSort();

  // Search mutation
  const { mutate: search, isPending } = usePatternSearchMutation();

  // Ref for debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable serialized key to detect pattern changes (memoized to avoid inline JSON.stringify in deps)
  const patternKey = useMemo(() => JSON.stringify({ nodes, edges }), [nodes, edges]);

  // Clear results when pattern becomes incomplete
  const displayedResults = isComplete ? searchResults : null;

  // Auto-search when pattern is complete (debounced)
  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Don't search if pattern is incomplete
    if (!isComplete) {
      return;
    }

    // Debounce the search to avoid excessive API calls while editing
    debounceRef.current = setTimeout(() => {
      search(
        {
          pattern: { nodes, edges },
          pageSize: DEFAULT_PATTERN_PAGE_SIZE,
          pageNumber: 1,
          sortAttribute: sortState.attribute,
          sortDirection: sortState.direction
        },
        {
          onSuccess: data => setSearchResults(data)
        }
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isComplete, patternKey, search, nodes, edges]);

  // Handle pagination (no debounce needed - explicit user action)
  const handlePageChange = useCallback(
    (page: number) => {
      search(
        {
          pattern: { nodes, edges },
          pageSize: DEFAULT_PATTERN_PAGE_SIZE,
          pageNumber: page,
          sortAttribute: sortState.attribute,
          sortDirection: sortState.direction
        },
        {
          onSuccess: data => setSearchResults(data)
        }
      );
    },
    [search, nodes, edges, sortState]
  );

  // Handle sort change (triggers immediate search)
  const handleSortChange = useCallback(() => {
    if (!isComplete) return;
    search(
      {
        pattern: { nodes, edges },
        pageSize: DEFAULT_PATTERN_PAGE_SIZE,
        pageNumber: 1,
        sortAttribute: sortState.attribute,
        sortDirection: sortState.direction
      },
      {
        onSuccess: data => setSearchResults(data)
      }
    );
  }, [search, nodes, edges, isComplete, sortState]);

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
      {/* Pattern Builder */}
      <ResizablePanel defaultSize={60} minSize={20}>
        <div className="flex h-full flex-col">
          <PatternBuilderComponent />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Results */}
      <ResizablePanel defaultSize={40} minSize={15}>
        <div className="flex h-full flex-col pt-2">
          <PatternResultsComponent
            data={displayedResults}
            isLoading={isPending}
            onPageChange={handlePageChange}
            incompleteReason={incompleteReason}
            sortState={sortState}
            onAttributeChange={setAttribute}
            onDirectionToggle={toggleDirection}
            onSortChange={handleSortChange}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AdvancedSearchComponent;
