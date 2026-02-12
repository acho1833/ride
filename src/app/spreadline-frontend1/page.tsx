'use client';

/**
 * SpreadLine Frontend Test Page
 *
 * Verifies that the ported SpreadLine algorithm and D3 visualization work correctly.
 * Mirrors the working spreadline-frontend1 from the spreadline2 project.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SpreadLineData } from '@/lib/spreadline-viz/spreadline-types';
import SpreadLineChart from '@/lib/spreadline-viz/spreadline-chart';
import { SpreadLine } from '@/lib/spreadline';

interface RawDataResponse {
  ego: string;
  dataset: string;
  topology: {
    source: string;
    target: string;
    time: string;
    weight: number;
  }[];
  lineColor: {
    entity: string;
    color: string;
  }[];
  groups: Record<string, string[][]>;
  nodeContext: {
    entity: string;
    time: string;
    context: number;
  }[];
  config: {
    timeDelta: string;
    timeFormat: string;
    squeezeSameCategory: boolean;
    minimize: string;
  };
}

export default function SpreadLineFrontend1Page() {
  const [rawData, setRawData] = useState<RawDataResponse | null>(null);
  const [computedData, setComputedData] = useState<SpreadLineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computeTime, setComputeTime] = useState<number | null>(null);

  // Filter state
  const [yearsFilter, setYearsFilter] = useState(1);
  const [crossingOnly, setCrossingOnly] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());

  // Fetch raw data from ORPC endpoint
  useEffect(() => {
    async function fetchRawData() {
      try {
        setLoading(true);
        const response = await fetch('/api/spreadlines/raw-data');
        if (!response.ok) {
          throw new Error(`Failed to fetch raw data: ${response.statusText}`);
        }
        const data = await response.json();
        setRawData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchRawData();
  }, []);

  // Compute SpreadLine layout client-side when raw data is available
  useEffect(() => {
    if (!rawData) return;

    async function computeLayout() {
      const data = rawData;
      if (!data) return;

      try {
        setComputing(true);
        const startTime = performance.now();

        const spreadline = new SpreadLine();

        // Load topology
        spreadline.load(data.topology, { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology');

        // Load line colors
        spreadline.load(data.lineColor, { entity: 'entity', color: 'color' }, 'line');

        // Load node context
        if (data.nodeContext && data.nodeContext.length > 0) {
          spreadline.load(data.nodeContext, { time: 'time', entity: 'entity', context: 'context' }, 'node');
        }

        // Center on ego
        spreadline.center(data.ego, undefined, data.config.timeDelta, data.config.timeFormat, data.groups);

        // Configure
        spreadline.configure({
          squeezeSameCategory: data.config.squeezeSameCategory,
          minimize: data.config.minimize as 'space' | 'line' | 'wiggles'
        });

        // Calculate dynamic width
        const allNames = new Set<string>();
        data.topology.forEach(t => {
          allNames.add(t.source);
          allNames.add(t.target);
        });
        const longestName = Math.max(...Array.from(allNames).map(n => n.length));
        const labelWidth = longestName * 8 + 80;
        const numTimestamps = new Set(data.topology.map(t => t.time)).size;
        const minWidthPerTimestamp = Math.max(200, labelWidth);
        const dynamicWidth = numTimestamps * minWidthPerTimestamp;

        const result = spreadline.fit(dynamicWidth, 1000);

        const endTime = performance.now();
        setComputeTime(endTime - startTime);

        const dataWithMode = {
          ...result,
          mode: 'author',
          reference: []
        } as SpreadLineData;

        setComputedData(dataWithMode);
      } catch (err) {
        console.error('Layout computation error:', err);
        setError(err instanceof Error ? err.message : 'Layout computation failed');
      } finally {
        setComputing(false);
      }
    }

    computeLayout();
  }, [rawData]);

  const handleRefresh = useCallback(() => {
    setResetKey(k => k + 1);
    setExpandedBlocks(new Set());
    setYearsFilter(1);
    setCrossingOnly(false);
  }, []);

  const handleBlockExpand = useCallback((blockId: number, expanded: boolean) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (expanded) {
        next.add(blockId);
      } else {
        next.delete(blockId);
      }
      return next;
    });
  }, []);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
          <div className="text-xl text-gray-700">Fetching raw data from server...</div>
        </div>
      </div>
    );
  }

  if (computing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-400 border-t-transparent" />
          <div className="text-xl text-gray-700">Computing layout in browser...</div>
          <div className="mt-2 text-sm text-gray-500">Running ordering, aligning, compacting algorithms</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="rounded-xl border border-red-500 bg-gray-50 p-8 text-center">
          <div className="mb-2 text-xl text-red-600">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!computedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-400 border-t-transparent" />
          <div className="text-xl text-gray-700">Computing layout in browser...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-black text-gray-900">
              SpreadLine <span className="text-green-600">Frontend v1</span>
            </h1>
            <p className="text-xs text-gray-500">
              {computedData.storylines.length} entities | {computedData.blocks.length} blocks | Ego: {computedData.ego}
              {computeTime && <span className="ml-2 text-green-600">| Computed in {computeTime.toFixed(0)}ms</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">Client-Side Computation</div>
            <button onClick={handleRefresh} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Legend Bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold text-gray-700">Some Labels</span>
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 bg-[#424242]" />
              <span className="text-gray-700">Ego</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 bg-[#FA9902]" />
              <span className="text-gray-700">Colleague</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 bg-[#146b6b]" />
              <span className="text-gray-700">Collaborator</span>
            </span>
          </div>
          <div className="ml-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="range"
                id="length"
                min="1"
                max={maxLifespan}
                value={yearsFilter}
                onChange={e => setYearsFilter(Number(e.target.value))}
                className="w-24 accent-gray-500"
              />
              <output className="w-6 font-bold text-gray-700">{yearsFilter}</output>
              <label htmlFor="length" className="font-bold text-gray-700">
                Years
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="crossing"
                checked={crossingOnly}
                onChange={e => setCrossingOnly(e.target.checked)}
                className="accent-gray-500"
              />
              <label htmlFor="crossing" className="font-bold text-gray-700">
                Only show crossing lines
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization Container */}
      <div className="relative flex-1 overflow-auto bg-white">
        <SpreadLineChart
          key={resetKey}
          data={computedData}
          config={config}
          onBlockExpand={handleBlockExpand}
          className="min-w-full"
          resetKey={resetKey}
          yearsFilter={yearsFilter}
          crossingOnly={crossingOnly}
        />
      </div>

      {/* Instructions */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <div>
            <span className="text-gray-400">Click block:</span> <span className="text-gray-700">Expand/collapse</span>
          </div>
          <div>
            <span className="text-gray-400">Hover storyline:</span> <span className="text-gray-700">Highlight</span>
          </div>
          <div>
            <span className="text-gray-400">Click storyline:</span> <span className="text-gray-700">Pin</span>
          </div>
          <div>
            <span className="text-gray-400">Drag on timeline:</span> <span className="text-gray-700">Brush selection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
