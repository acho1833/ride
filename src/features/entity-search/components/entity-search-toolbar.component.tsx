'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ArrowUpAZIcon, ArrowDownZAIcon } from 'lucide-react';

interface Props {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  sortDirection: 'asc' | 'desc';
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when sort direction changes */
  onSortChange: (direction: 'asc' | 'desc') => void;
}

/**
 * Toolbar with pagination controls and sort toggle.
 * Layout: [Result count] [Prev/Next] [Sort toggle]
 * Displayed at the top of search results (always visible).
 */
const EntitySearchToolbarComponent = ({
  pageNumber,
  pageSize,
  totalCount,
  sortDirection,
  onPageChange,
  onSortChange
}: Props) => {
  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endItem = Math.min(pageNumber * pageSize, totalCount);

  // Determine if navigation is possible
  const canGoPrev = pageNumber > 1;
  const canGoNext = pageNumber < totalPages;

  // Toggle sort direction
  const handleSortToggle = () => {
    onSortChange(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center justify-between">
      {/* Result count info */}
      <span className="text-muted-foreground text-xs">
        Showing {startItem}-{endItem} of {totalCount}
      </span>

      {/* Navigation and sort buttons */}
      <div className="flex items-center gap-x-1">
        {/* Pagination buttons */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={!canGoPrev}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={!canGoNext}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>

        {/* Sort toggle button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleSortToggle}
          title={sortDirection === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUpAZIcon className="h-4 w-4" />
          ) : (
            <ArrowDownZAIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default EntitySearchToolbarComponent;
