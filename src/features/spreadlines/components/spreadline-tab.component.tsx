'use client';

/**
 * Spreadline Tab Component
 *
 * Editor tab for .sl files. Shows D3 force graph on top
 * and SpreadLine chart on bottom in a resizable split layout.
 * Manages selectedRange state shared between graph and chart.
 *
 * Range state: [startIndex, endIndex] into timeBlocks, or null = ALL mode.
 */

import { useState, useMemo, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import { SPREADLINE_DEFAULT_EGO_ID, SPREADLINE_DEFAULT_RELATION_TYPES, SPREADLINE_DEFAULT_YEAR_RANGE } from '@/features/spreadlines/const';
import { getTimeBlocks } from '@/features/spreadlines/utils';
import SpreadlineGraphComponent from './spreadline-graph.component';
import SpreadlineComponent from './spreadline.component';

interface Props {
  fileId: string;
  fileName: string;
}

const SpreadlineTabComponent = (_props: Props) => {
  // Default to first year ([0,0]). Before timeBlocks load, selectedTimes will be [] = ALL mode.
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>([0, 0]);
  const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>(SPREADLINE_DEFAULT_RELATION_TYPES);

  const { data: rawData } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE
  });

  const timeBlocks = useMemo(() => (rawData ? getTimeBlocks(rawData) : []), [rawData]);

  // Derive selected time strings from range indices
  const selectedTimes = useMemo(
    () => (selectedRange ? timeBlocks.slice(selectedRange[0], selectedRange[1] + 1) : []),
    [selectedRange, timeBlocks]
  );

  // Update range when highlight bar handles are dragged on spreadline chart
  const handleHighlightRangeChange = useCallback(
    (startLabel: string, endLabel: string) => {
      const startIdx = timeBlocks.indexOf(startLabel);
      const endIdx = timeBlocks.indexOf(endLabel);
      if (startIdx !== -1 && endIdx !== -1) {
        setSelectedRange([Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]);
      }
    },
    [timeBlocks]
  );

  // Expand range to include clicked time column on spreadline
  const handleTimeClick = useCallback(
    (timeLabel: string) => {
      const idx = timeBlocks.indexOf(timeLabel);
      if (idx === -1) return;

      if (!selectedRange) {
        // No range — select clicked column
        setSelectedRange([idx, idx]);
      } else {
        // Expand range to include clicked column
        const newStart = Math.min(selectedRange[0], idx);
        const newEnd = Math.max(selectedRange[1], idx);
        setSelectedRange([newStart, newEnd]);
      }
    },
    [timeBlocks, selectedRange]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Graph Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <SpreadlineGraphComponent selectedTimes={selectedTimes} pinnedEntityNames={pinnedEntityNames} relationTypes={relationTypes} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Spreadline Chart Panel */}
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
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SpreadlineTabComponent;
