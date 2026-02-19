'use client';

/**
 * Spreadline Component
 *
 * Renders a SpreadLine ego-network visualization in a bottom panel tab.
 * Fetches raw data via ORPC, computes layout client-side, renders with D3.
 * Pan/zoom via Ctrl+wheel / Ctrl+drag; floating controls at lower-right.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Minus, Plus, Maximize } from 'lucide-react';
import type { SpreadLineData } from '@/lib/spreadline-viz/spreadline-types';
import SpreadLineChart from '@/lib/spreadline-viz/spreadline-chart';
import type { SpreadLineChartHandle } from '@/lib/spreadline-viz/spreadline-chart';
import { SpreadLine } from '@/lib/spreadline';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import {
  SPREADLINE_DEFAULT_EGO_ID,
  SPREADLINE_DEFAULT_RELATION_TYPES,
  SPREADLINE_DEFAULT_YEAR_RANGE,
  SPREADLINE_MIN_WIDTH_PER_TIMESTAMP,
  SPREADLINE_CHART_HEIGHT,
  SPREADLINE_CATEGORY_COLORS,
  SPREADLINE_CHAR_WIDTH_PX,
  SPREADLINE_LABEL_PADDING_PX,
  SPREADLINE_TIME_DELTA,
  SPREADLINE_TIME_FORMAT,
  SPREADLINE_SQUEEZE_SAME_CATEGORY,
  SPREADLINE_MINIMIZE
} from '@/features/spreadlines/const';
import { Button } from '@/components/ui/button';

interface Props {
  workspaceId?: string;
  workspaceName?: string;
  highlightTimes?: string[];
  onTimeClick?: (timeLabel: string) => void;
  onHighlightRangeChange?: (startLabel: string, endLabel: string) => void;
  onEntityPin?: (names: string[]) => void;
}

const SpreadlineComponent = ({ highlightTimes, onTimeClick, onHighlightRangeChange, onEntityPin }: Props) => {
  const {
    data: rawData,
    isPending,
    isError,
    error
  } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes: SPREADLINE_DEFAULT_RELATION_TYPES,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE
  });
  const [computedData, setComputedData] = useState<SpreadLineData | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  // Filter state
  const [yearsFilter, setYearsFilter] = useState(1);
  const [crossingOnly, setCrossingOnly] = useState(false);
  const [resetKey, setResetKey] = useState(0);

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
        const topoData = rawData.topology.map(t => ({
          source: nameOf(t.sourceId),
          target: nameOf(t.targetId),
          time: t.time,
          weight: t.weight
        }));
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

        // Convert group IDs to names
        const namedGroups: Record<string, string[][]> = {};
        for (const [time, groups] of Object.entries(rawData.groups)) {
          namedGroups[time] = groups.map(group => group.map(id => nameOf(id)));
        }

        spreadline.center(nameOf(rawData.egoId), undefined, SPREADLINE_TIME_DELTA, SPREADLINE_TIME_FORMAT, namedGroups);
        spreadline.configure({
          squeezeSameCategory: SPREADLINE_SQUEEZE_SAME_CATEGORY,
          minimize: SPREADLINE_MINIMIZE
        });

        // Calculate dynamic width based on entity names
        const allNames = new Set<string>();
        rawData.topology.forEach(t => {
          const srcName = rawData.entities[t.sourceId]?.name ?? t.sourceId;
          const tgtName = rawData.entities[t.targetId]?.name ?? t.targetId;
          allNames.add(srcName);
          allNames.add(tgtName);
        });
        const longestName = Math.max(...Array.from(allNames).map(n => n.length));
        const labelWidth = longestName * SPREADLINE_CHAR_WIDTH_PX + SPREADLINE_LABEL_PADDING_PX;
        const numTimestamps = new Set(rawData.topology.map(t => t.time)).size;
        const minWidthPerTimestamp = Math.max(SPREADLINE_MIN_WIDTH_PER_TIMESTAMP, labelWidth);
        const dynamicWidth = numTimestamps * minWidthPerTimestamp;

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
  }, [rawData]);

  const maxLifespan = computedData ? Math.max(...computedData.storylines.map(s => s.lifespan)) : 50;

  const config = useMemo(
    () => ({
      content: {
        customize: () => {},
        collisionDetection: true,
        showLinks: false
      }
    }),
    []
  );

  if (isPending || computing) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-muted-foreground text-sm">{isPending ? 'Fetching data...' : 'Computing layout...'}</div>
        </div>
      </div>
    );
  }

  if (isError || computeError) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="text-destructive text-sm">{computeError ?? error?.message ?? 'Failed to load SpreadLine'}</div>
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
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max={maxLifespan}
            value={yearsFilter}
            onChange={e => setYearsFilter(Number(e.target.value))}
            className="w-20 accent-current"
          />
          <span className="text-foreground w-4 font-medium">{yearsFilter}</span>
          <label className="text-muted-foreground">Years</label>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="checkbox" checked={crossingOnly} onChange={e => setCrossingOnly(e.target.checked)} />
          <label className="text-muted-foreground">Crossing only</label>
        </div>
      </div>

      {/* Chart with d3-zoom */}
      <div className="relative min-h-0 flex-1">
        <SpreadLineChart
          ref={chartRef}
          key={resetKey}
          data={computedData}
          config={config}
          resetKey={resetKey}
          yearsFilter={yearsFilter}
          crossingOnly={crossingOnly}
          onZoomChange={handleZoomChange}
          highlightTimes={highlightTimes && highlightTimes.length > 0 ? highlightTimes : undefined}
          onTimeClick={onTimeClick}
          onHighlightRangeChange={onHighlightRangeChange}
          onEntityPin={onEntityPin}
        />

        {/* Floating zoom controls */}
        <div className="bg-background/80 border-border absolute right-2 bottom-2 flex items-center gap-0.5 rounded-lg border px-1 py-0.5">
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
