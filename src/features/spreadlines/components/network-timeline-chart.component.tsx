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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
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
import { setDragCursor, clearDragCursor } from '@/features/spreadlines/utils/drag-cursor';
import SpreadlineToolbarComponent from '@/features/spreadlines/components/spreadline-toolbar.component';


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
      clearDragCursor();
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
      setDragCursor(mode === 'pan' ? 'grabbing' : 'ew-resize');
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

  // 3. Filter by selected time range — entities with activity in highlighted times
  const highlightSet = useMemo(() => new Set(highlightTimes ?? []), [highlightTimes]);

  const inTimeRangeNames = useMemo(() => {
    if (highlightSet.size === 0) return null; // null = all in range (no filter active)
    return new Set(blocksFiltered.filter(e => e.timeBlocks.some(tb => highlightSet.has(tb.time))).map(e => e.name));
  }, [blocksFiltered, highlightSet]);

  // Max lifespan for slider range
  const maxLifespan = useMemo(() => {
    if (allEntities.length === 0) return 1;
    return Math.max(...allEntities.map(e => e.lifespan), 1);
  }, [allEntities]);

  // 4. Report filteredEntityNames to parent (only in-range entities for graph filtering)
  useEffect(() => {
    if (!onFilteredEntityNamesChange) return;
    const names = inTimeRangeNames
      ? blocksFiltered.filter(e => inTimeRangeNames.has(e.name)).map(e => e.name)
      : blocksFiltered.map(e => e.name);
    onFilteredEntityNamesChange(names);
  }, [blocksFiltered, inTimeRangeNames, onFilteredEntityNamesChange]);

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
    if (!svgRef.current || blocksFiltered.length === 0 || timeBlocks.length === 0 || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const pad = NETWORK_TIMELINE_PADDING;
    const chartWidth = containerWidth - pad.left - pad.right;
    const chartHeight = blocksFiltered.length * NETWORK_TIMELINE_ROW_HEIGHT;

    // Build a set of time block indices for consecutive-check lookups
    const timeBlockIndex = new Map<string, number>();
    timeBlocks.forEach((tb, i) => timeBlockIndex.set(tb, i));

    // X scale: time blocks (used as-is — descending from API, newest on left)
    const xScale = d3.scaleBand().domain(timeBlocks).range([0, chartWidth]).padding(0.1);

    // Y scale: entity names in filtered order
    const yScale = d3
      .scaleBand()
      .domain(blocksFiltered.map(e => e.name))
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
    for (const entity of blocksFiltered) {
      const cy = (yScale(entity.name) ?? 0) + yScale.bandwidth() / 2;
      const isDimmed = inTimeRangeNames !== null && !inTimeRangeNames.has(entity.name);

      // Wrap entity row in a group for opacity
      const row = g.append('g');
      if (isDimmed) row.attr('opacity', 0.25);

      // Entity name label (clickable for pin toggle)
      const isPinned = pinnedEntityNames.includes(entity.name);
      const labelColor = isPinned ? 'var(--primary)' : 'currentColor';
      const labelWeight = isPinned ? '600' : 'normal';

      const label = row
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
          row
            .append('line')
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
        row
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', NETWORK_TIMELINE_DOT_RADIUS)
          .attr('fill', color)
          .attr('stroke', 'var(--border)')
          .attr('stroke-width', 1);
      }
    }
  }, [
    blocksFiltered,
    inTimeRangeNames,
    timeBlocks,
    selectedRange,
    highlightSet,
    pinnedEntityNames,
    handleEntityClick,
    handleTimeColumnClick,
    containerWidth
  ]);

  const svgHeight = NETWORK_TIMELINE_PADDING.top + NETWORK_TIMELINE_PADDING.bottom + blocksFiltered.length * NETWORK_TIMELINE_ROW_HEIGHT;

  // Compute highlight overlay position for the HTML drag layer
  const pad = NETWORK_TIMELINE_PADDING;
  const chartWidth = containerWidth - pad.left - pad.right;
  const bandWidth = timeBlocks.length > 0 ? chartWidth / timeBlocks.length : 0;
  const hlLeft = selectedRange ? pad.left + selectedRange[0] * bandWidth : 0;
  const hlWidth = selectedRange ? (selectedRange[1] - selectedRange[0] + 1) * bandWidth : 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <SpreadlineToolbarComponent
        infoSlot={
          <span className="text-muted-foreground whitespace-nowrap">
            <span className="hidden min-[1400px]:inline">
              {blocksFiltered.length} entities{inTimeRangeNames ? ` (${inTimeRangeNames.size} in range)` : ''} | {timeBlocks.length} blocks
              {rawData ? ' | ' : ''}
            </span>
            {rawData ? `Ego: ${rawData.egoName}` : ''}
          </span>
        }
        maxLifespan={maxLifespan}
        blocksFilter={blocksFilter}
        onBlocksFilterChange={onBlocksFilterChange}
        relationTypes={relationTypes}
        onRelationTypesChange={onRelationTypesChange}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
        pinnedCount={pinnedEntityNames.length}
        onClearPins={() => onEntityPin?.([])}
      />

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
