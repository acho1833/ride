'use client';

/**
 * Spreadline Component
 *
 * Renders a SpreadLine ego-network visualization in a bottom panel tab.
 * Fetches raw data via ORPC, computes layout client-side, renders with D3.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SpreadLineData } from '@/lib/spreadline-viz/spreadline-types';
import SpreadLineChart from '@/lib/spreadline-viz/spreadline-chart';
import { SpreadLine } from '@/lib/spreadline';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import { SPREADLINE_DEFAULT_EGO, SPREADLINE_MIN_WIDTH_PER_TIMESTAMP, SPREADLINE_CHART_HEIGHT } from '@/features/spreadlines/const';

interface Props {
  workspaceId: string;
  workspaceName: string;
}

const SpreadlineComponent = ({ workspaceId, workspaceName }: Props) => {
  const { data: rawData, isPending, isError, error } = useSpreadlineRawDataQuery(SPREADLINE_DEFAULT_EGO);
  const [computedData, setComputedData] = useState<SpreadLineData | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);
  const [computeTime, setComputeTime] = useState<number | null>(null);

  // Filter state
  const [yearsFilter, setYearsFilter] = useState(1);
  const [crossingOnly, setCrossingOnly] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Compute SpreadLine layout when raw data arrives
  useEffect(() => {
    if (!rawData) return;

    async function computeLayout() {
      if (!rawData) return;
      try {
        setComputing(true);
        const startTime = performance.now();

        const spreadline = new SpreadLine();
        spreadline.load(rawData.topology, { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology');
        spreadline.load(rawData.lineColor, { entity: 'entity', color: 'color' }, 'line');

        if (rawData.nodeContext && rawData.nodeContext.length > 0) {
          spreadline.load(rawData.nodeContext, { time: 'time', entity: 'entity', context: 'context' }, 'node');
        }

        spreadline.center(rawData.ego, undefined, rawData.config.timeDelta, rawData.config.timeFormat, rawData.groups);
        spreadline.configure({
          squeezeSameCategory: rawData.config.squeezeSameCategory,
          minimize: rawData.config.minimize as 'space' | 'line' | 'wiggles'
        });

        // Calculate dynamic width based on data
        const allNames = new Set<string>();
        rawData.topology.forEach(t => {
          allNames.add(t.source);
          allNames.add(t.target);
        });
        const longestName = Math.max(...Array.from(allNames).map(n => n.length));
        const labelWidth = longestName * 8 + 80;
        const numTimestamps = new Set(rawData.topology.map(t => t.time)).size;
        const minWidthPerTimestamp = Math.max(SPREADLINE_MIN_WIDTH_PER_TIMESTAMP, labelWidth);
        const dynamicWidth = numTimestamps * minWidthPerTimestamp;

        const result = spreadline.fit(dynamicWidth, SPREADLINE_CHART_HEIGHT);
        setComputeTime(performance.now() - startTime);
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

  const handleRefresh = useCallback(() => {
    setResetKey(k => k + 1);
    setYearsFilter(1);
    setCrossingOnly(false);
    setZoomLevel(100);
  }, []);

  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Apply zoom by widening the container — SVG fills it via width="100%", viewBox scales content
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;
    container.style.width = zoomLevel === 100 ? '' : `${zoomLevel}%`;
  }, [zoomLevel, computedData, resetKey]);

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
    <div className="bg-background">
      {/* Toolbar */}
      <div className="bg-background border-border sticky top-0 z-10 flex items-center gap-4 border-b px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          {computedData.storylines.length} entities | {computedData.blocks.length} blocks | Ego: {computedData.ego}
          {computeTime && <span className="text-primary ml-1">({computeTime.toFixed(0)}ms)</span>}
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
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
            className="text-muted-foreground hover:text-foreground rounded px-1"
          >
            −
          </button>
          <input
            type="range"
            min="50"
            max="500"
            value={zoomLevel}
            onChange={e => setZoomLevel(Number(e.target.value))}
            className="w-20 accent-current"
          />
          <button
            onClick={() => setZoomLevel(z => Math.min(500, z + 25))}
            className="text-muted-foreground hover:text-foreground rounded px-1"
          >
            +
          </button>
          <span className="text-muted-foreground w-8 text-center">{zoomLevel}%</span>
        </div>
        <button onClick={handleRefresh} className="text-muted-foreground hover:text-foreground">
          Refresh
        </button>
      </div>

      {/* Chart with zoom */}
      <div ref={zoomContainerRef}>
        <SpreadLineChart
          key={resetKey}
          data={computedData}
          config={config}
          resetKey={resetKey}
          yearsFilter={yearsFilter}
          crossingOnly={crossingOnly}
        />
      </div>
    </div>
  );
};

export default SpreadlineComponent;
