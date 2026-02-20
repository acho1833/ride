'use client';

/**
 * Spreadline Tab Component
 *
 * Editor tab for .sl files. Shows D3 force graph on top
 * and SpreadLine chart on bottom in a resizable split layout.
 * Manages selectedRange, granularity, and pagination state.
 *
 * Range state: [startIndex, endIndex] into visibleTimeBlocks, or null = ALL mode.
 */

import { useState, useMemo, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import {
  SPREADLINE_DEFAULT_EGO_ID,
  SPREADLINE_DEFAULT_RELATION_TYPES,
  SPREADLINE_DEFAULT_YEAR_RANGE,
  SPREADLINE_DEFAULT_GRANULARITY,
  SPREADLINE_PAGE_SIZE,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';
import { getTimeBlocks, getPagedTimeBlocks } from '@/features/spreadlines/utils';
import SpreadlineGraphComponent from './spreadline-graph.component';
import SpreadlineComponent from './spreadline.component';

interface Props {
  fileId: string;
  fileName: string;
}

const SpreadlineTabComponent = (_props: Props) => {
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>([0, 0]);
  const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>(SPREADLINE_DEFAULT_RELATION_TYPES);
  const [granularity, setGranularity] = useState<SpreadlineGranularity>(SPREADLINE_DEFAULT_GRANULARITY);
  const [pageIndex, setPageIndex] = useState(0);

  const { data: rawData } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE,
    granularity
  });

  const allTimeBlocks = useMemo(() => (rawData ? getTimeBlocks(rawData) : []), [rawData]);

  const { blocks: visibleTimeBlocks, totalPages } = useMemo(
    () => getPagedTimeBlocks(allTimeBlocks, SPREADLINE_PAGE_SIZE, pageIndex),
    [allTimeBlocks, pageIndex]
  );

  const selectedTimes = useMemo(
    () => (selectedRange ? visibleTimeBlocks.slice(selectedRange[0], selectedRange[1] + 1) : []),
    [selectedRange, visibleTimeBlocks]
  );

  const handleGranularityChange = useCallback((newGranularity: SpreadlineGranularity) => {
    setGranularity(newGranularity);
    setPageIndex(0);
    setSelectedRange([0, 0]);
  }, []);

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
    setSelectedRange([0, 0]);
  }, []);

  const handleHighlightRangeChange = useCallback(
    (startLabel: string, endLabel: string) => {
      const startIdx = visibleTimeBlocks.indexOf(startLabel);
      const endIdx = visibleTimeBlocks.indexOf(endLabel);
      if (startIdx !== -1 && endIdx !== -1) {
        setSelectedRange([Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]);
      }
    },
    [visibleTimeBlocks]
  );

  const handleTimeClick = useCallback(
    (timeLabel: string) => {
      const idx = visibleTimeBlocks.indexOf(timeLabel);
      if (idx === -1) return;

      if (!selectedRange) {
        setSelectedRange([idx, idx]);
      } else {
        const newStart = Math.min(selectedRange[0], idx);
        const newEnd = Math.max(selectedRange[1], idx);
        setSelectedRange([newStart, newEnd]);
      }
    },
    [visibleTimeBlocks, selectedRange]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={50} minSize={20}>
          <SpreadlineGraphComponent
            selectedTimes={selectedTimes}
            pinnedEntityNames={pinnedEntityNames}
            relationTypes={relationTypes}
            granularity={granularity}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full overflow-hidden">
            <SpreadlineComponent
              highlightTimes={selectedTimes}
              pinnedEntityNames={pinnedEntityNames}
              relationTypes={relationTypes}
              onRelationTypesChange={setRelationTypes}
              onTimeClick={handleTimeClick}
              onHighlightRangeChange={handleHighlightRangeChange}
              onEntityPin={setPinnedEntityNames}
              granularity={granularity}
              onGranularityChange={handleGranularityChange}
              pageIndex={pageIndex}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SpreadlineTabComponent;
