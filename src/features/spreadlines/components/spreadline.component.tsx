'use client';

/**
 * Spreadline Component
 *
 * Renders a SpreadLine ego-network visualization in a bottom panel tab.
 * Receives pre-filtered raw data, computes layout client-side, renders with D3.
 * Pan/zoom via Ctrl+wheel / Ctrl+drag; floating controls at lower-right.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Minus, Plus, Maximize, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SpreadLineData, SpreadLineConfig } from '@/lib/spreadline-viz/spreadline-types';
import SpreadLineChart from '@/lib/spreadline-viz/spreadline-chart';
import type { SpreadLineChartHandle } from '@/lib/spreadline-viz/spreadline-chart';
import { SpreadLine } from '@/lib/spreadline';
import {
  SPREADLINE_RELATION_TYPE_OPTIONS,
  SPREADLINE_MIN_WIDTH_PER_TIMESTAMP,
  SPREADLINE_CHART_HEIGHT,
  SPREADLINE_CATEGORY_COLORS,
  SPREADLINE_SQUEEZE_SAME_CATEGORY,
  SPREADLINE_MINIMIZE,
  SPREADLINE_GRANULARITY_OPTIONS,
  SPREADLINE_TIME_CONFIG,
  SPREADLINE_FREQUENCY_COLORS,
  SPREADLINE_FREQUENCY_THRESHOLDS,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SpreadlineRawData {
  egoId: string;
  egoName: string;
  dataset: string;
  entities: Record<string, { name: string; category: 'internal' | 'external'; citations: Record<string, number> }>;
  topology: { sourceId: string; targetId: string; time: string; weight: number }[];
  groups: Record<string, string[][]>;
  timeBlocks: string[];
}

interface Props {
  rawData: SpreadlineRawData | null;
  highlightTimes?: string[];
  pinnedEntityNames?: string[];
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  onTimeClick?: (timeLabel: string) => void;
  onHighlightRangeChange?: (startLabel: string, endLabel: string) => void;
  onEntityPin?: (names: string[]) => void;
  granularity: SpreadlineGranularity;
  onGranularityChange: (granularity: SpreadlineGranularity) => void;
  splitByAffiliation: boolean;
  onSplitByAffiliationChange: (value: boolean) => void;
  pageIndex: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  blocksFilter: number;
  onBlocksFilterChange: (value: number) => void;
  onFilteredEntityNamesChange?: (names: string[]) => void;
}

const SpreadlineComponent = ({
  rawData,
  highlightTimes,
  pinnedEntityNames = [],
  relationTypes,
  onRelationTypesChange,
  onTimeClick,
  onHighlightRangeChange,
  onEntityPin,
  granularity,
  onGranularityChange,
  splitByAffiliation,
  onSplitByAffiliationChange,
  pageIndex,
  totalPages,
  onPageChange,
  blocksFilter,
  onBlocksFilterChange,
  onFilteredEntityNamesChange
}: Props) => {
  const [computedData, setComputedData] = useState<SpreadLineData | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  // Filter state
  const [crossingOnly, setCrossingOnly] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Legend toggle state
  const [hiddenColors, setHiddenColors] = useState<Set<string>>(new Set());
  const [labelsVisible, setLabelsVisible] = useState(true);

  const chartRef = useRef<SpreadLineChartHandle>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleZoomChange = useCallback((level: number) => {
    setZoomLevel(level);
  }, []);

  // Compute SpreadLine layout when raw data arrives
  useEffect(() => {
    if (!rawData) return;

    async function computeLayout() {
      if (!rawData) return;
      try {
        setComputing(true);
        const spreadline = new SpreadLine();

        // Build ID-to-name mapping from entities + ego
        const idToName: Record<string, string> = { [rawData.egoId]: rawData.egoName };
        for (const [id, entity] of Object.entries(rawData.entities)) {
          idToName[id] = entity.name;
        }
        const nameOf = (id: string) => idToName[id] ?? id;
        const egoName = nameOf(rawData.egoId);

        // Build topology, adding dummy entries for padded time blocks
        // so the SpreadLine library creates columns for all timeBlocks.
        const topoData = rawData.topology.map(t => ({
          source: nameOf(t.sourceId),
          target: nameOf(t.targetId),
          time: t.time,
          weight: t.weight
        }));
        const realTimes = new Set(rawData.topology.map(t => t.time));
        const firstEntityName = Object.values(rawData.entities)[0]?.name;
        if (firstEntityName) {
          for (const time of rawData.timeBlocks) {
            if (!realTimes.has(time)) {
              topoData.push({ source: egoName, target: firstEntityName, time, weight: 0 });
            }
          }
        }
        spreadline.load(topoData, { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology');

        // Convert entities map to line color array
        const lineColorData = Object.entries(rawData.entities).map(([id, entity]) => ({
          entity: nameOf(id),
          color: SPREADLINE_CATEGORY_COLORS[entity.category] ?? SPREADLINE_CATEGORY_COLORS.external
        }));
        spreadline.load(lineColorData, { entity: 'entity', color: 'color' }, 'line');

        // Convert entities citations to node context array
        const nodeContextData: { entity: string; time: string; context: number }[] = [];
        for (const [id, entity] of Object.entries(rawData.entities)) {
          for (const [time, count] of Object.entries(entity.citations)) {
            nodeContextData.push({ entity: nameOf(id), time, context: count });
          }
        }
        if (nodeContextData.length > 0) {
          spreadline.load(nodeContextData, { time: 'time', entity: 'entity', context: 'context' }, 'node');
        }

        // Convert group IDs to names — include empty groups for padded time blocks
        const namedGroups: Record<string, string[][]> = {};
        for (const [time, groups] of Object.entries(rawData.groups)) {
          namedGroups[time] = groups.map(group => group.map(id => nameOf(id)));
        }
        for (const time of rawData.timeBlocks) {
          if (!namedGroups[time]) {
            namedGroups[time] = [[], [], [egoName], [], []];
          }
        }

        const timeConfig = SPREADLINE_TIME_CONFIG[granularity];
        // timeBlocks are descending; timeExtents needs [oldest, newest]
        const timeExtents: [string, string] | undefined =
          rawData.timeBlocks.length >= 2 ? [rawData.timeBlocks[rawData.timeBlocks.length - 1], rawData.timeBlocks[0]] : undefined;
        spreadline.center(egoName, timeExtents, timeConfig.delta, timeConfig.format, namedGroups);
        spreadline.configure({
          squeezeSameCategory: SPREADLINE_SQUEEZE_SAME_CATEGORY,
          minimize: SPREADLINE_MINIMIZE
        });

        // Fixed width: consistent across all pages so viewBox stays identical
        const dynamicWidth = rawData.timeBlocks.length * SPREADLINE_MIN_WIDTH_PER_TIMESTAMP;

        const result = spreadline.fit(dynamicWidth, SPREADLINE_CHART_HEIGHT);
        setComputedData({ ...result, mode: 'author', reference: [] } as SpreadLineData);
      } catch (err) {
        console.error('SpreadLine layout error:', err);
        setComputeError(err instanceof Error ? err.message : 'Layout computation failed');
      } finally {
        setComputing(false);
      }
    }

    computeLayout();
  }, [rawData, granularity]);

  const maxLifespan = computedData ? Math.max(...computedData.storylines.map(s => s.lifespan)) : 50;

  // Report filtered entity names to parent for graph sync
  useEffect(() => {
    if (!computedData || !onFilteredEntityNamesChange) return;
    const ego = computedData.ego;
    const names = computedData.storylines.filter(s => s.name === ego || s.lifespan >= blocksFilter).map(s => s.name);
    onFilteredEntityNamesChange(names);
  }, [computedData, blocksFilter, onFilteredEntityNamesChange]);

  const config = useMemo(
    () =>
      ({
        content: {
          customize: () => {},
          collisionDetection: true,
          showLinks: false
        },
        legend: {
          line: { domain: [] as string[], range: [] as string[], offset: [] as number[] }
        } as SpreadLineConfig['legend'],
        ...(splitByAffiliation
          ? {}
          : {
              background: {
                direction: [] as string[],
                directionFontSize: '3rem',
                timeLabelFormat: (d: string) => d,
                annotations: [],
                timeHighlight: [] as string[],
                sliderTitle: 'Min Years'
              }
            })
      }) as Partial<SpreadLineConfig>,
    [splitByAffiliation]
  );

  if (!rawData || computing) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-muted-foreground text-sm">{!rawData ? 'Fetching data...' : 'Computing layout...'}</div>
        </div>
      </div>
    );
  }

  if (computeError) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="text-destructive text-sm">{computeError}</div>
      </div>
    );
  }

  if (!computedData) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-muted-foreground text-sm">Computing layout...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-background border-border flex shrink-0 items-center gap-4 border-b px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          {computedData.storylines.length} entities | {computedData.blocks.length} blocks | Ego: {computedData.ego}
        </span>
        {splitByAffiliation && (
          <>
            <div className="bg-border h-4 w-px" />
            {Object.entries(SPREADLINE_CATEGORY_COLORS).map(([category, color]) => (
              <button
                key={category}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-100"
                style={{ opacity: hiddenColors.has(color) ? 0.3 : 0.9 }}
                onClick={() => {
                  chartRef.current?.toggleLineVisibility(color);
                  setHiddenColors(prev => {
                    const next = new Set(prev);
                    if (next.has(color)) next.delete(color);
                    else next.add(color);
                    return next;
                  });
                }}
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border"
                  style={{
                    backgroundColor: hiddenColors.has(color) ? 'transparent' : color,
                    borderColor: color
                  }}
                />
                <span className="capitalize">{category}</span>
              </button>
            ))}
            <div className="bg-border h-4 w-px" />
            <span className="text-muted-foreground font-medium">Frequencies</span>
            <div className="relative">
              <div className="flex">
                {SPREADLINE_FREQUENCY_COLORS.map((color, i) => (
                  <span key={i} className="border-border inline-block h-2.5 w-6 border" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="text-muted-foreground absolute flex text-[9px]">
                {SPREADLINE_FREQUENCY_THRESHOLDS.map((t, i) => (
                  <span key={t} className="absolute -translate-x-1/2" style={{ left: (i + 1) * 24 }}>
                    {i === SPREADLINE_FREQUENCY_THRESHOLDS.length - 1 ? `${t}+` : t}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max={maxLifespan}
            value={blocksFilter}
            onChange={e => onBlocksFilterChange(Number(e.target.value))}
            className="w-20 accent-current"
          />
          <span className="text-foreground w-4 font-medium">{blocksFilter}</span>
          <label className="text-muted-foreground">Blocks</label>
        </div>
        {splitByAffiliation && (
          <div className="flex items-center gap-1.5">
            <input type="checkbox" checked={crossingOnly} onChange={e => setCrossingOnly(e.target.checked)} />
            <label className="text-muted-foreground">Crossing only</label>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <input type="checkbox" checked={splitByAffiliation} onChange={e => onSplitByAffiliationChange(e.target.checked)} />
          <label className="text-muted-foreground">Split by affiliation</label>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={labelsVisible}
            onChange={e => {
              chartRef.current?.toggleLabels();
              setLabelsVisible(e.target.checked);
            }}
          />
          <label className="text-muted-foreground">Show labels</label>
        </div>
        <Select value={relationTypes[0]} onValueChange={val => onRelationTypesChange([val])}>
          <SelectTrigger className="ml-auto h-7 w-auto gap-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPREADLINE_RELATION_TYPE_OPTIONS.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={granularity} onValueChange={val => onGranularityChange(val as SpreadlineGranularity)}>
          <SelectTrigger className="h-7 w-auto gap-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPREADLINE_GRANULARITY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          disabled={pinnedEntityNames.length === 0}
          onClick={() => chartRef.current?.clearPins()}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      </div>

      {/* Chart with d3-zoom */}
      <div className="relative min-h-0 flex-1">
        <SpreadLineChart
          ref={chartRef}
          key={resetKey}
          data={computedData}
          config={config}
          resetKey={resetKey}
          blocksFilter={blocksFilter}
          crossingOnly={crossingOnly}
          onZoomChange={handleZoomChange}
          highlightTimes={highlightTimes && highlightTimes.length > 0 ? highlightTimes : undefined}
          onTimeClick={onTimeClick}
          onHighlightRangeChange={onHighlightRangeChange}
          onEntityPin={onEntityPin}
        />

        {/* Floating zoom controls */}
        <div className="bg-background/80 border-border absolute right-2 bottom-2 flex items-center gap-0.5 rounded-lg border px-1 py-0.5">
          {totalPages > 1 && (
            <>
              <Button variant="ghost" size="icon-xs" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)}>
                <ChevronLeft />
              </Button>
              <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
                {pageIndex + 1}/{totalPages}
              </span>
              <Button variant="ghost" size="icon-xs" disabled={pageIndex >= totalPages - 1} onClick={() => onPageChange(pageIndex + 1)}>
                <ChevronRight />
              </Button>
              <div className="bg-border mx-0.5 h-4 w-px" />
            </>
          )}
          <Button variant="ghost" size="icon-xs" onClick={() => chartRef.current?.zoomOut()}>
            <Minus />
          </Button>
          <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">{zoomLevel}%</span>
          <Button variant="ghost" size="icon-xs" onClick={() => chartRef.current?.zoomIn()}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => chartRef.current?.zoomToFit()}>
            <Maximize />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpreadlineComponent;
