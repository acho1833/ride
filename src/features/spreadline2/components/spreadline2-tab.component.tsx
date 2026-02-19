'use client';

/**
 * Spreadline 2 Tab Component
 *
 * Editor tab for .sl2 files. Shows D3 force graph on top
 * and SpreadLine chart on bottom in a resizable split layout.
 * Manages selectedRange state shared between graph and chart.
 *
 * Range state: [startIndex, endIndex] into timeBlocks, or null = ALL mode.
 */

import { useState, useMemo, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSpreadline2RawDataQuery } from '@/features/spreadline2/hooks/useSpreadline2RawDataQuery';
import {
  SPREADLINE2_DEFAULT_EGO_ID,
  SPREADLINE2_DEFAULT_RELATION_TYPES,
  SPREADLINE2_DEFAULT_YEAR_RANGE
} from '@/features/spreadline2/const';
import { getTimeBlocks } from '@/features/spreadline2/utils';
import Spreadline2GraphComponent from './spreadline2-graph.component';
import Spreadline2Component from './spreadline2.component';

interface Props {
  fileId: string;
  fileName: string;
}

const Spreadline2TabComponent = (_props: Props) => {
  // Default to first year ([0,0]). Before timeBlocks load, selectedTimes will be [] = ALL mode.
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>([0, 0]);
  const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>([]);

  const { data: rawData } = useSpreadline2RawDataQuery({
    egoId: SPREADLINE2_DEFAULT_EGO_ID,
    relationTypes: SPREADLINE2_DEFAULT_RELATION_TYPES,
    yearRange: SPREADLINE2_DEFAULT_YEAR_RANGE
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
          <Spreadline2GraphComponent selectedTimes={selectedTimes} pinnedEntityNames={pinnedEntityNames} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Spreadline Chart Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full overflow-hidden">
            <Spreadline2Component
              highlightTimes={selectedTimes}
              pinnedEntityNames={pinnedEntityNames}
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

export default Spreadline2TabComponent;
