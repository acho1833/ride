'use client';

/**
 * Spreadline Tab Component
 *
 * Editor tab for .sl files. Shows D3 force graph on top
 * and SpreadLine chart on bottom in a resizable split layout.
 * Manages selectedRange, granularity, and pagination state.
 *
 * Pagination is server-side: the API returns only the current page's data.
 * Range state: [startIndex, endIndex] into timeBlocks, or null = ALL mode.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import {
  SPREADLINE_DEFAULT_EGO_ID,
  SPREADLINE_DEFAULT_RELATION_TYPES,
  SPREADLINE_DEFAULT_YEAR_RANGE,
  SPREADLINE_DEFAULT_GRANULARITY,
  SPREADLINE_DEFAULT_SPLIT_BY_AFFILIATION,
  SPREADLINE_PAGE_SIZE,
  type SpreadlineGranularity,
  type SpreadlineBottomTab
} from '@/features/spreadlines/const';
import SpreadlineGraphComponent from './spreadline-graph.component';
import SpreadlineComponent from './spreadline.component';
import SpreadlineBottomTabsComponent from './spreadline-bottom-tabs.component';
import NetworkTimelineChartComponent from './network-timeline-chart.component';

interface SpreadlineTabCache {
  selectedRange: [number, number] | null;
  pinnedEntityNames: string[];
  relationTypes: string[];
  granularity: SpreadlineGranularity;
  splitByAffiliation: boolean;
  pageIndex: number;
  blocksFilter: number;
  activeBottomTab: SpreadlineBottomTab;
}

/** Module-level cache: preserves tab state across unmount/remount (e.g. split-and-move) */
const tabStateCache = new Map<string, SpreadlineTabCache>();

interface Props {
  fileId: string;
  fileName: string;
}

const SpreadlineTabComponent = ({ fileId }: Props) => {
  const cached = tabStateCache.get(fileId);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(cached?.selectedRange ?? [0, 0]);
  const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>(cached?.pinnedEntityNames ?? []);
  const [relationTypes, setRelationTypes] = useState<string[]>(cached?.relationTypes ?? SPREADLINE_DEFAULT_RELATION_TYPES);
  const [granularity, setGranularity] = useState<SpreadlineGranularity>(cached?.granularity ?? SPREADLINE_DEFAULT_GRANULARITY);
  const [splitByAffiliation, setSplitByAffiliation] = useState(cached?.splitByAffiliation ?? SPREADLINE_DEFAULT_SPLIT_BY_AFFILIATION);
  const [pageIndex, setPageIndex] = useState(cached?.pageIndex ?? 0);
  const [blocksFilter, setBlocksFilter] = useState(cached?.blocksFilter ?? 1);
  const [filteredEntityNames, setFilteredEntityNames] = useState<string[] | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<SpreadlineBottomTab>(cached?.activeBottomTab ?? 'spreadline');

  // Sync state to cache so it survives unmount/remount
  useEffect(() => {
    tabStateCache.set(fileId, {
      selectedRange,
      pinnedEntityNames,
      relationTypes,
      granularity,
      splitByAffiliation,
      pageIndex,
      blocksFilter,
      activeBottomTab
    });
  }, [fileId, selectedRange, pinnedEntityNames, relationTypes, granularity, splitByAffiliation, pageIndex, blocksFilter, activeBottomTab]);

  const { data: rawData } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE,
    granularity,
    splitByAffiliation,
    pageIndex,
    pageSize: SPREADLINE_PAGE_SIZE
  });

  const timeBlocks = rawData?.timeBlocks ?? [];
  const totalPages = rawData?.totalPages ?? 1;

  const selectedTimes = useMemo(
    () => (selectedRange ? timeBlocks.slice(selectedRange[0], selectedRange[1] + 1) : []),
    [selectedRange, timeBlocks]
  );

  const handleGranularityChange = useCallback((newGranularity: SpreadlineGranularity) => {
    setGranularity(newGranularity);
    setPageIndex(0);
    setSelectedRange([0, 0]);
    setBlocksFilter(1);
  }, []);

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
    setSelectedRange([0, 0]);
  }, []);

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

  const handleTimeClick = useCallback(
    (timeLabel: string) => {
      const idx = timeBlocks.indexOf(timeLabel);
      if (idx === -1) return;

      setSelectedRange([idx, idx]);
    },
    [timeBlocks]
  );

  const { openNewFile } = useOpenFilesActions();

  const handleLinkDoubleClick = useCallback(
    (sourceId: string, targetId: string, sourceName: string, targetName: string) => {
      const getLastName = (name: string) => name.split(' ').pop() ?? name;
      const sortedIds = [sourceId, targetId].sort();
      // Convert yearly values ("2022") to monthly bounds ("2022-01"/"2022-12")
      // so the year range filter works with monthly event data
      const toMonthlyMin = (t: string) => (t && !t.includes('-') ? `${t}-01` : t);
      const toMonthlyMax = (t: string) => (t && !t.includes('-') ? `${t}-12` : t);
      const timeStart = selectedTimes.length > 0 ? toMonthlyMax(selectedTimes[0]) : '';
      const timeEnd = selectedTimes.length > 0 ? toMonthlyMin(selectedTimes[selectedTimes.length - 1]) : '';
      openNewFile({
        id: `re-${sortedIds[0]}-${sortedIds[1]}`,
        name: `${getLastName(sourceName)} ↔ ${getLastName(targetName)}.re`,
        metadata: { sourceId, targetId, sourceName, targetName, timeStart, timeEnd }
      });
    },
    [openNewFile, selectedTimes]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={50} minSize={20}>
          <SpreadlineGraphComponent
            rawData={rawData ?? null}
            selectedTimes={selectedTimes}
            pinnedEntityNames={pinnedEntityNames}
            filteredEntityNames={filteredEntityNames}
            onLinkDoubleClick={handleLinkDoubleClick}
            onEntityPin={setPinnedEntityNames}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="flex h-full w-full flex-col overflow-hidden">
            <SpreadlineBottomTabsComponent activeTab={activeBottomTab} onTabChange={setActiveBottomTab} />
            <div className="min-h-0 flex-1">
              {activeBottomTab === 'spreadline' ? (
                <SpreadlineComponent
                  rawData={rawData ?? null}
                  highlightTimes={selectedTimes}
                  pinnedEntityNames={pinnedEntityNames}
                  relationTypes={relationTypes}
                  onRelationTypesChange={setRelationTypes}
                  onTimeClick={handleTimeClick}
                  onHighlightRangeChange={handleHighlightRangeChange}
                  onEntityPin={setPinnedEntityNames}
                  granularity={granularity}
                  onGranularityChange={handleGranularityChange}
                  splitByAffiliation={splitByAffiliation}
                  onSplitByAffiliationChange={setSplitByAffiliation}
                  pageIndex={pageIndex}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  blocksFilter={blocksFilter}
                  onBlocksFilterChange={setBlocksFilter}
                  onFilteredEntityNamesChange={setFilteredEntityNames}
                />
              ) : (
                <NetworkTimelineChartComponent
                  rawData={rawData ?? null}
                  timeBlocks={timeBlocks}
                  highlightTimes={selectedTimes}
                  selectedRange={selectedRange}
                  pinnedEntityNames={pinnedEntityNames}
                  relationTypes={relationTypes}
                  onRelationTypesChange={setRelationTypes}
                  onTimeClick={handleTimeClick}
                  onHighlightRangeChange={handleHighlightRangeChange}
                  granularity={granularity}
                  onGranularityChange={handleGranularityChange}
                  pageIndex={pageIndex}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  blocksFilter={blocksFilter}
                  onBlocksFilterChange={setBlocksFilter}
                  onFilteredEntityNamesChange={setFilteredEntityNames}
                  onEntityPin={setPinnedEntityNames}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SpreadlineTabComponent;
