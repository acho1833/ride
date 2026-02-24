'use client';

/**
 * Network Timeline Chart Component
 *
 * Renders horizontal dot-and-line timelines per entity, sorted by activity count.
 * Dots are colored by citation frequency using a heatmap threshold scale.
 * Shares all state (filters, pins, pagination) with the sibling Spreadline tab.
 *
 * Features:
 * - Entities filtered by selected time range (only active ones shown)
 * - Highlight overlay with drag handles for time range selection
 * - Click time column to select, drag to expand/pan
 * - Graph syncs via shared selectedRange state
 */

import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
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
  SPREADLINE_HIGHLIGHT_FILL,
  SPREADLINE_HIGHLIGHT_STROKE,
  SPREADLINE_HIGHLIGHT_HANDLE_WIDTH,
  SPREADLINE_HIGHLIGHT_HANDLE_COLOR,
  SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';
import type { SpreadlineRawData } from '@/features/spreadlines/components/spreadline.component';
import { transformSpreadlineToTimeline } from '@/features/spreadlines/utils';
import type { TimelineEntity } from '@/features/spreadlines/utils';

/** D3 threshold scale: citation count -> heatmap fill color */
const citationColorScale = d3.scaleThreshold<number, string>().domain(SPREADLINE_FREQUENCY_THRESHOLDS).range(SPREADLINE_FREQUENCY_COLORS);

interface Props {
  rawData: SpreadlineRawData | null;
  timeBlocks: string[];
  highlightTimes?: string[];
  selectedRange: [number, number] | null;
  pinnedEntityNames: string[];
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  onTimeClick?: (timeLabel: string) => void;
  onHighlightRangeChange?: (startLabel: string, endLabel: string) => void;
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

/** Drag state for highlight overlay handles */
interface DragState {
  mode: 'left' | 'right' | 'pan';
  startX: number;
  origRange: [number, number];
}

const NetworkTimelineChartComponent = ({
  rawData,
  timeBlocks,
  highlightTimes,
  selectedRange,
  pinnedEntityNames,
  relationTypes,
  onRelationTypesChange,
  onTimeClick,
  onHighlightRangeChange,
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
  const dragRef = useRef<DragState | null>(null);

  // Keep refs for drag handlers (avoids re-registering window listeners)
  const timeBlocksRef = useRef(timeBlocks);
  useLayoutEffect(() => {
    timeBlocksRef.current = timeBlocks;
  }, [timeBlocks]);
  const onHighlightRangeChangeRef = useRef(onHighlightRangeChange);
  useLayoutEffect(() => {
    onHighlightRangeChangeRef.current = onHighlightRangeChange;
  }, [onHighlightRangeChange]);
  const selectedRangeRef = useRef(selectedRange);
  useLayoutEffect(() => {
    selectedRangeRef.current = selectedRange;
  }, [selectedRange]);

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

  // Convert clientX to time block index using the band scale geometry
  const xToIndex = useCallback(
    (clientX: number): number => {
      if (!containerRef.current || timeBlocks.length === 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const pad = NETWORK_TIMELINE_PADDING;
      const chartWidth = rect.width - pad.left - pad.right;
      const relX = clientX - rect.left - pad.left;
      const fraction = Math.max(0, Math.min(1, relX / chartWidth));
      return Math.round(fraction * (timeBlocks.length - 1));
    },
    [timeBlocks.length]
  );

  // Window-level drag listeners for highlight overlay
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const tbs = timeBlocksRef.current;
      const idx = xToIndex(e.clientX);
      const max = tbs.length - 1;
      const [origStart, origEnd] = drag.origRange;

      let newStart: number;
      let newEnd: number;

      if (drag.mode === 'left') {
        newStart = Math.min(idx, origEnd);
        newEnd = origEnd;
      } else if (drag.mode === 'right') {
        newStart = origStart;
        newEnd = Math.max(idx, origStart);
      } else {
        // pan
        const delta = idx - xToIndex(drag.startX);
        const rangeSize = origEnd - origStart;
        newStart = origStart + delta;
        newEnd = origEnd + delta;
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeSize;
        }
        if (newEnd > max) {
          newEnd = max;
          newStart = max - rangeSize;
        }
      }

      newStart = Math.max(0, Math.min(max, newStart));
      newEnd = Math.max(0, Math.min(max, newEnd));
      onHighlightRangeChangeRef.current?.(tbs[newStart], tbs[newEnd]);
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [xToIndex]);

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: DragState['mode']) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode,
        startX: e.clientX,
        origRange: selectedRange ? [...selectedRange] : [0, 0]
      };
    },
    [selectedRange]
  );

  // 1. Compute timeline entities from raw data (exclude ego)
  const allEntities = useMemo<TimelineEntity[]>(() => {
    if (!rawData) return [];
    return transformSpreadlineToTimeline(rawData).filter(e => !e.isEgo);
  }, [rawData]);

  // 2. Filter by blocksFilter
  const blocksFiltered = useMemo(() => {
    return allEntities.filter(e => e.lifespan >= blocksFilter);
  }, [allEntities, blocksFilter]);

  // 3. Filter by selected time range — only show entities with activity in highlighted times
  const highlightSet = useMemo(() => new Set(highlightTimes ?? []), [highlightTimes]);

  const filteredEntities = useMemo(() => {
    if (highlightSet.size === 0) return blocksFiltered;
    return blocksFiltered.filter(e => e.timeBlocks.some(tb => highlightSet.has(tb.time)));
  }, [blocksFiltered, highlightSet]);

  // Max lifespan for slider range
  const maxLifespan = useMemo(() => {
    if (allEntities.length === 0) return 1;
    return Math.max(...allEntities.map(e => e.lifespan), 1);
  }, [allEntities]);

  // 4. Report filteredEntityNames to parent
  useEffect(() => {
    if (!onFilteredEntityNamesChange) return;
    const names = filteredEntities.map(e => e.name);
    onFilteredEntityNamesChange(names);
  }, [filteredEntities, onFilteredEntityNamesChange]);

  // Pin toggle handler
  const handleEntityClick = useCallback(
    (name: string) => {
      if (!onEntityPin) return;
      const updated = pinnedEntityNames.includes(name) ? pinnedEntityNames.filter(n => n !== name) : [...pinnedEntityNames, name];
      onEntityPin(updated);
    },
    [pinnedEntityNames, onEntityPin]
  );

  // Handle clicking a time column
  const handleTimeColumnClick = useCallback(
    (timeLabel: string) => {
      onTimeClick?.(timeLabel);
    },
    [onTimeClick]
  );

  // D3 SVG rendering
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
    const xScale = d3.scaleBand().domain(timeBlocks).range([0, chartWidth]).padding(0.1);

    // Y scale: entity names in filtered order
    const yScale = d3
      .scaleBand()
      .domain(filteredEntities.map(e => e.name))
      .range([0, chartHeight])
      .padding(0.1);

    const g = svg.append('g').attr('transform', `translate(${pad.left},${pad.top})`);

    // Highlight overlay for selected time range
    if (selectedRange && selectedRange[0] <= selectedRange[1]) {
      const startTime = timeBlocks[selectedRange[0]];
      const endTime = timeBlocks[selectedRange[1]];
      if (startTime && endTime) {
        const x1 = xScale(startTime) ?? 0;
        const x2 = (xScale(endTime) ?? 0) + xScale.bandwidth();
        const hlGroup = g.append('g').attr('class', 'highlight-overlay');

        // Highlight rect
        hlGroup
          .append('rect')
          .attr('x', x1)
          .attr('y', -pad.top)
          .attr('width', x2 - x1)
          .attr('height', chartHeight + pad.top)
          .attr('fill', SPREADLINE_HIGHLIGHT_FILL)
          .attr('stroke', SPREADLINE_HIGHLIGHT_STROKE)
          .attr('stroke-width', 1);

        // Left drag handle
        hlGroup
          .append('rect')
          .attr('x', x1 - SPREADLINE_HIGHLIGHT_HANDLE_WIDTH / 2)
          .attr('y', -pad.top)
          .attr('width', SPREADLINE_HIGHLIGHT_HANDLE_WIDTH)
          .attr('height', chartHeight + pad.top)
          .attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_COLOR)
          .attr('cursor', 'ew-resize')
          .attr('class', 'handle-left');

        // Right drag handle
        hlGroup
          .append('rect')
          .attr('x', x2 - SPREADLINE_HIGHLIGHT_HANDLE_WIDTH / 2)
          .attr('y', -pad.top)
          .attr('width', SPREADLINE_HIGHLIGHT_HANDLE_WIDTH)
          .attr('height', chartHeight + pad.top)
          .attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_COLOR)
          .attr('cursor', 'ew-resize')
          .attr('class', 'handle-right');
      }
    }

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

    // Time labels at top (clickable)
    g.selectAll('.time-label')
      .data(timeBlocks)
      .enter()
      .append('text')
      .attr('x', d => (xScale(d) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', d => (highlightSet.has(d) ? 'var(--primary)' : 'var(--muted-foreground)'))
      .attr('font-weight', d => (highlightSet.has(d) ? '600' : 'normal'))
      .attr('cursor', 'pointer')
      .text(d => d)
      .on('click', (_, d) => handleTimeColumnClick(d));

    // Clickable invisible rects over each time column (easier click targets)
    g.selectAll('.time-click-target')
      .data(timeBlocks)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d) ?? 0)
      .attr('y', -pad.top)
      .attr('width', xScale.bandwidth())
      .attr('height', chartHeight + pad.top)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => handleTimeColumnClick(d));

    // Render each entity row
    for (const entity of filteredEntities) {
      const cy = (yScale(entity.name) ?? 0) + yScale.bandwidth() / 2;

      // Entity name label (clickable for pin toggle)
      const isPinned = pinnedEntityNames.includes(entity.name);
      const labelColor = isPinned ? 'var(--primary)' : 'currentColor';
      const labelWeight = isPinned ? '600' : 'normal';

      const label = g
        .append('text')
        .attr('x', -10)
        .attr('y', cy)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '11px')
        .attr('font-weight', labelWeight)
        .attr('fill', labelColor)
        .attr('cursor', 'pointer')
        .text(entity.name)
        .on('click', () => handleEntityClick(entity.name));

      label.append('title').text(entity.name);

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
        const cx = (xScale(tb.time) ?? 0) + xScale.bandwidth() / 2;
        const color = citationColorScale(tb.citationCount);
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', NETWORK_TIMELINE_DOT_RADIUS)
          .attr('fill', color)
          .attr('stroke', 'var(--border)')
          .attr('stroke-width', 1);
      }
    }
  }, [
    filteredEntities,
    timeBlocks,
    selectedRange,
    highlightSet,
    pinnedEntityNames,
    handleEntityClick,
    handleTimeColumnClick,
    containerWidth
  ]);

  const svgHeight = NETWORK_TIMELINE_PADDING.top + NETWORK_TIMELINE_PADDING.bottom + filteredEntities.length * NETWORK_TIMELINE_ROW_HEIGHT;

  // Compute highlight overlay position for the HTML drag layer
  const pad = NETWORK_TIMELINE_PADDING;
  const chartWidth = containerWidth - pad.left - pad.right;
  const bandWidth = timeBlocks.length > 0 ? chartWidth / timeBlocks.length : 0;
  const hlLeft = selectedRange ? pad.left + selectedRange[0] * bandWidth : 0;
  const hlWidth = selectedRange ? (selectedRange[1] - selectedRange[0] + 1) * bandWidth : 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-background border-border flex shrink-0 items-center gap-4 border-b px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          {filteredEntities.length} entities | {timeBlocks.length} blocks{rawData ? ` | Ego: ${rawData.egoName}` : ''}
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
        <svg ref={svgRef} className="text-foreground w-full" height={svgHeight} style={{ minHeight: svgHeight }} />

        {/* HTML drag layer for highlight handles (overlays the SVG) */}
        {selectedRange && hlWidth > 0 && (
          <div className="pointer-events-none absolute top-0" style={{ left: hlLeft, width: hlWidth, height: svgHeight }}>
            {/* Left handle */}
            <div
              className="pointer-events-auto absolute top-0 bottom-0 -left-1.5 w-3 cursor-ew-resize"
              style={{ background: SPREADLINE_HIGHLIGHT_HANDLE_COLOR }}
              onPointerDown={e => startDrag(e, 'left')}
              onPointerEnter={e => ((e.target as HTMLElement).style.background = SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR)}
              onPointerLeave={e => ((e.target as HTMLElement).style.background = SPREADLINE_HIGHLIGHT_HANDLE_COLOR)}
            />
            {/* Pan area */}
            <div
              className="pointer-events-auto absolute inset-0 cursor-grab active:cursor-grabbing"
              onPointerDown={e => startDrag(e, 'pan')}
            />
            {/* Right handle */}
            <div
              className="pointer-events-auto absolute top-0 -right-1.5 bottom-0 w-3 cursor-ew-resize"
              style={{ background: SPREADLINE_HIGHLIGHT_HANDLE_COLOR }}
              onPointerDown={e => startDrag(e, 'right')}
              onPointerEnter={e => ((e.target as HTMLElement).style.background = SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR)}
              onPointerLeave={e => ((e.target as HTMLElement).style.background = SPREADLINE_HIGHLIGHT_HANDLE_COLOR)}
            />
          </div>
        )}

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
              <Button variant="ghost" size="icon-xs" disabled={pageIndex >= totalPages - 1} onClick={() => onPageChange(pageIndex + 1)}>
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkTimelineChartComponent;
