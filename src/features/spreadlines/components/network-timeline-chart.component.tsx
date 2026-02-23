'use client';

/**
 * Network Timeline Chart Component
 *
 * Renders horizontal dot-and-line timelines per entity, sorted by activity count.
 * Dots are colored by citation frequency using a heatmap threshold scale.
 * Shares all state (filters, pins, pagination) with the sibling Spreadline tab.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SPREADLINE_RELATION_TYPE_OPTIONS,
  SPREADLINE_GRANULARITY_OPTIONS,
  SPREADLINE_FREQUENCY_COLORS,
  SPREADLINE_FREQUENCY_THRESHOLDS,
  NETWORK_TIMELINE_ROW_HEIGHT,
  NETWORK_TIMELINE_DOT_RADIUS,
  NETWORK_TIMELINE_LINE_WIDTH,
  NETWORK_TIMELINE_PADDING,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';
import type { SpreadlineRawData } from '@/features/spreadlines/components/spreadline.component';
import { transformSpreadlineToTimeline } from '@/features/spreadlines/utils';
import type { TimelineEntity } from '@/features/spreadlines/utils';

/** Ego name label color — blue matching the spreadline chart ego highlight */
const EGO_LABEL_COLOR = 'hsl(210, 70%, 50%)';

/** D3 threshold scale: citation count -> heatmap fill color */
const citationColorScale = d3
  .scaleThreshold<number, string>()
  .domain(SPREADLINE_FREQUENCY_THRESHOLDS)
  .range(SPREADLINE_FREQUENCY_COLORS);

interface Props {
  rawData: SpreadlineRawData | null;
  timeBlocks: string[];
  pinnedEntityNames: string[];
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  granularity: SpreadlineGranularity;
  onGranularityChange: (granularity: SpreadlineGranularity) => void;
  pageIndex: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  blocksFilter: number;
  onBlocksFilterChange: (value: number) => void;
  onFilteredEntityNamesChange?: (names: string[]) => void;
  onEntityPin?: (names: string[]) => void;
}

const NetworkTimelineChartComponent = ({
  rawData,
  timeBlocks,
  pinnedEntityNames,
  relationTypes,
  onRelationTypesChange,
  granularity,
  onGranularityChange,
  pageIndex,
  totalPages,
  onPageChange,
  blocksFilter,
  onBlocksFilterChange,
  onFilteredEntityNamesChange,
  onEntityPin
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe container width for responsive X scale
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 1. Compute timeline entities from raw data
  const allEntities = useMemo<TimelineEntity[]>(() => {
    if (!rawData) return [];
    return transformSpreadlineToTimeline(rawData);
  }, [rawData]);

  // 2. Filter by blocksFilter: ego always included
  const filteredEntities = useMemo(() => {
    return allEntities.filter(e => e.isEgo || e.lifespan >= blocksFilter);
  }, [allEntities, blocksFilter]);

  // Max lifespan for slider range
  const maxLifespan = useMemo(() => {
    if (allEntities.length === 0) return 1;
    return Math.max(...allEntities.map(e => e.lifespan), 1);
  }, [allEntities]);

  // 3. Report filteredEntityNames to parent
  useEffect(() => {
    if (!onFilteredEntityNamesChange) return;
    const names = filteredEntities.map(e => e.name);
    onFilteredEntityNamesChange(names);
  }, [filteredEntities, onFilteredEntityNamesChange]);

  // Pin toggle handler
  const handleEntityClick = useCallback(
    (name: string) => {
      if (!onEntityPin) return;
      const updated = pinnedEntityNames.includes(name)
        ? pinnedEntityNames.filter(n => n !== name)
        : [...pinnedEntityNames, name];
      onEntityPin(updated);
    },
    [pinnedEntityNames, onEntityPin]
  );

  // 5. D3 SVG rendering
  useEffect(() => {
    if (!svgRef.current || filteredEntities.length === 0 || timeBlocks.length === 0 || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const pad = NETWORK_TIMELINE_PADDING;
    const chartWidth = containerWidth - pad.left - pad.right;
    const chartHeight = filteredEntities.length * NETWORK_TIMELINE_ROW_HEIGHT;

    // Build a set of time block indices for consecutive-check lookups
    const timeBlockIndex = new Map<string, number>();
    timeBlocks.forEach((tb, i) => timeBlockIndex.set(tb, i));

    // X scale: time blocks (used as-is — descending from API, newest on left)
    const xScale = d3
      .scaleBand()
      .domain(timeBlocks)
      .range([0, chartWidth])
      .padding(0.1);

    // Y scale: entity names in filtered order
    const yScale = d3
      .scaleBand()
      .domain(filteredEntities.map(e => e.name))
      .range([0, chartHeight])
      .padding(0.1);

    const g = svg.append('g').attr('transform', `translate(${pad.left},${pad.top})`);

    // Grid lines (vertical at each time block)
    g.selectAll('.grid-line')
      .data(timeBlocks)
      .enter()
      .append('line')
      .attr('x1', d => (xScale(d) ?? 0) + xScale.bandwidth() / 2)
      .attr('y1', 0)
      .attr('x2', d => (xScale(d) ?? 0) + xScale.bandwidth() / 2)
      .attr('y2', chartHeight)
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,3');

    // Time labels at top
    g.selectAll('.time-label')
      .data(timeBlocks)
      .enter()
      .append('text')
      .attr('x', d => (xScale(d) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'var(--muted-foreground)')
      .text(d => d);

    // Render each entity row
    for (const entity of filteredEntities) {
      const cy = (yScale(entity.name) ?? 0) + yScale.bandwidth() / 2;
      const activeTimesSet = new Set(entity.timeBlocks.map(tb => tb.time));
      const citationMap = new Map(entity.timeBlocks.map(tb => [tb.time, tb.citationCount]));

      // Entity name label (clickable for pin toggle)
      const isPinned = pinnedEntityNames.includes(entity.name);
      const labelColor = entity.isEgo ? EGO_LABEL_COLOR : isPinned ? 'var(--primary)' : 'currentColor';
      const labelWeight = entity.isEgo || isPinned ? '600' : 'normal';

      g.append('text')
        .attr('x', -10)
        .attr('y', cy)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '11px')
        .attr('font-weight', labelWeight)
        .attr('fill', labelColor)
        .attr('cursor', 'pointer')
        .text(entity.name.length > 16 ? entity.name.slice(0, 15) + '\u2026' : entity.name)
        .append('title')
        .text(entity.name);

      // Attach click handler to the text node
      g.select<SVGTextElement>('text:last-of-type').on('click', () => handleEntityClick(entity.name));

      // Lines between CONSECUTIVE active time blocks
      const sortedActive = entity.timeBlocks
        .map(tb => ({ ...tb, idx: timeBlockIndex.get(tb.time) ?? -1 }))
        .filter(tb => tb.idx >= 0)
        .sort((a, b) => a.idx - b.idx);

      for (let i = 0; i < sortedActive.length - 1; i++) {
        const curr = sortedActive[i];
        const next = sortedActive[i + 1];
        if (Math.abs(curr.idx - next.idx) === 1) {
          const x1 = (xScale(curr.time) ?? 0) + xScale.bandwidth() / 2;
          const x2 = (xScale(next.time) ?? 0) + xScale.bandwidth() / 2;
          g.append('line')
            .attr('x1', x1)
            .attr('y1', cy)
            .attr('x2', x2)
            .attr('y2', cy)
            .attr('stroke', citationColorScale(curr.citationCount))
            .attr('stroke-width', NETWORK_TIMELINE_LINE_WIDTH)
            .attr('stroke-linecap', 'round');
        }
      }

      // Dots at each active time block
      for (const tb of entity.timeBlocks) {
        if (!activeTimesSet.has(tb.time)) continue;
        const cx = (xScale(tb.time) ?? 0) + xScale.bandwidth() / 2;
        const color = citationColorScale(citationMap.get(tb.time) ?? 0);
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', NETWORK_TIMELINE_DOT_RADIUS)
          .attr('fill', color)
          .attr('stroke', 'var(--border)')
          .attr('stroke-width', 1);
      }
    }
  }, [filteredEntities, timeBlocks, pinnedEntityNames, handleEntityClick, containerWidth]);

  // Loading state
  if (!rawData) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-muted-foreground text-sm">Fetching data...</div>
        </div>
      </div>
    );
  }

  const svgHeight =
    NETWORK_TIMELINE_PADDING.top + NETWORK_TIMELINE_PADDING.bottom + filteredEntities.length * NETWORK_TIMELINE_ROW_HEIGHT;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-background border-border flex shrink-0 items-center gap-4 border-b px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          {filteredEntities.length} entities | {timeBlocks.length} blocks | Ego: {rawData.egoName}
        </span>

        <div className="bg-border h-4 w-px" />

        {/* Frequency heatmap legend */}
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

        {/* Blocks filter slider */}
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

        {/* Relation type dropdown */}
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

        {/* Granularity dropdown */}
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

        {/* Clear pins */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          disabled={pinnedEntityNames.length === 0}
          onClick={() => onEntityPin?.([])}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      </div>

      {/* Scrollable chart area */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <svg
          ref={svgRef}
          className="text-foreground w-full"
          height={svgHeight}
          style={{ minHeight: svgHeight }}
        />

        {/* Floating controls */}
        <div className="bg-background/80 border-border absolute right-2 bottom-2 flex items-center gap-0.5 rounded-lg border px-1 py-0.5">
          {totalPages > 1 && (
            <>
              <Button variant="ghost" size="icon-xs" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)}>
                <ChevronLeft />
              </Button>
              <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
                {pageIndex + 1}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pageIndex >= totalPages - 1}
                onClick={() => onPageChange(pageIndex + 1)}
              >
                <ChevronRight />
              </Button>
            </>
          )}
          <span className="text-muted-foreground px-2 text-xs">Zoom</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkTimelineChartComponent;
