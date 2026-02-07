'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, NetworkIcon } from 'lucide-react';
import PatternMatchRowComponent from './pattern-match-row.component';
import SaveWorkspaceModalComponent from './save-workspace-modal.component';
import type { PatternSearchResponse } from '../types';

interface Props {
  data: PatternSearchResponse | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  /** Message to display when pattern is incomplete (not ready for search) */
  incompleteReason: string | null;
}

/**
 * Displays pattern search results with pagination.
 * Each result is a linear chain of matched entities.
 * Shows appropriate messages for incomplete patterns or loading states.
 */
const PatternResultsComponent = ({ data, isLoading, onPageChange, incompleteReason }: Props) => {
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Show incomplete pattern message
  if (incompleteReason) {
    return <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">{incompleteReason}</div>;
  }

  // Loading state
  if (isLoading) {
    return <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">Searching...</div>;
  }

  // No data yet (pattern complete but no search triggered)
  if (!data) {
    return null;
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.totalCount / data.pageSize);
  const hasPrev = data.pageNumber > 1;
  const hasNext = data.pageNumber < totalPages;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-y-2">
      {/* Header with count and Show Graph button */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">Results ({data.totalCount} matches)</div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-x-1 text-xs"
          onClick={() => setShowSaveModal(true)}
          disabled={data.matches.length === 0}
        >
          <NetworkIcon className="h-3 w-3" />
          Show Graph
        </Button>
      </div>

      {/* Results list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-y-2 pr-2">
          {data.matches.map((match, index) => (
            <PatternMatchRowComponent key={index} match={match} />
          ))}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {data.pageNumber} of {totalPages}
          </span>
          <div className="flex gap-x-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onPageChange(data.pageNumber - 1)}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onPageChange(data.pageNumber + 1)}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Save as Workspace Modal */}
      <SaveWorkspaceModalComponent open={showSaveModal} onOpenChange={setShowSaveModal} matches={data.matches} />
    </div>
  );
};

export default PatternResultsComponent;
