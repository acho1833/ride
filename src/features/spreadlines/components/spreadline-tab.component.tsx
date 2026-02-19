'use client';

/**
 * Spreadline Tab Component
 *
 * Editor tab for .sl files. Shows D3 force graph on top (with time scrubber)
 * and SpreadLine chart on bottom in a resizable split layout.
 * Manages selectedTime state shared between graph, scrubber, and chart.
 */

import { useState, useMemo } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import { SPREADLINE_DEFAULT_EGO_ID, SPREADLINE_DEFAULT_RELATION_TYPES, SPREADLINE_DEFAULT_YEAR_RANGE } from '@/features/spreadlines/const';
import { getTimeBlocks } from '@/features/spreadlines/utils';
import SpreadlineGraphComponent from './spreadline-graph.component';
import SpreadlineComponent from './spreadline.component';
import SpreadlineScrubberComponent from './spreadline-scrubber.component';

interface Props {
  fileId: string;
  fileName: string;
}

const SpreadlineTabComponent = (_props: Props) => {
  const [selectedTime, setSelectedTime] = useState<string | 'ALL'>('ALL');

  const { data: rawData } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes: SPREADLINE_DEFAULT_RELATION_TYPES,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE
  });

  const timeBlocks = useMemo(() => (rawData ? getTimeBlocks(rawData) : []), [rawData]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Graph Panel (with scrubber at bottom) */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <SpreadlineGraphComponent selectedTime={selectedTime} />
            </div>
            <SpreadlineScrubberComponent timeBlocks={timeBlocks} selectedTime={selectedTime} onTimeChange={setSelectedTime} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Spreadline Chart Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full overflow-hidden">
            <SpreadlineComponent selectedTime={selectedTime} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SpreadlineTabComponent;
