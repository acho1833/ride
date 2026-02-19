'use client';

/**
 * SpreadLineChart - React Wrapper for D3 Visualization
 *
 * CRITICAL RENDERING SEPARATION:
 * =============================
 * - React re-renders ONLY when: data, config, or resetKey changes
 * - D3 handles ALL other updates: filtering, block expansion, hover, brush
 *
 * This ensures smooth D3 animations without React interference.
 */

import { useEffect, useRef, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { SpreadLinesVisualizer } from './spreadline-visualizer';
import { SpreadLineData, SpreadLineConfig, createDefaultConfig } from './spreadline-types';
import {
  SPREADLINE_HIGHLIGHT_FILL,
  SPREADLINE_HIGHLIGHT_STROKE,
  SPREADLINE_HIGHLIGHT_HANDLE_WIDTH,
  SPREADLINE_HIGHLIGHT_HANDLE_COLOR,
  SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR
} from '@/features/spreadlines/const';

/**
 * Keep callback in ref to prevent re-renders when callback identity changes.
 */
function useCallbackRef<T extends (...args: any[]) => any>(callback: T | undefined): React.MutableRefObject<T | undefined> {
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  }, [callback]);
  return ref;
}

/**
 * Keep value in ref to access current value without adding to dependencies.
 * Used for filter values that D3 needs but shouldn't trigger React re-init.
 */
function useValueRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export interface SpreadLineChartHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  getZoomLevel: () => number;
}

interface SpreadLineChartProps {
  /**
   * The SpreadLine data to visualize
   */
  data: SpreadLineData;

  /**
   * Optional configuration overrides
   */
  config?: Partial<SpreadLineConfig>;

  /**
   * Callback when a block is expanded or collapsed
   */
  onBlockExpand?: (blockId: number, expanded: boolean) => void;

  /**
   * Callback when filtered entities change
   */
  onFilterChange?: (filteredNames: string[]) => void;

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Key to force re-initialization (increment to reset)
   */
  resetKey?: number;

  /**
   * Years filter threshold (filter storylines with lifespan < yearsFilter)
   */
  yearsFilter?: number;

  /**
   * Show only crossing lines
   */
  crossingOnly?: boolean;

  /**
   * Callback when zoom level changes (percentage, e.g. 100 = 100%)
   */
  onZoomChange?: (level: number) => void;

  /**
   * Time labels to highlight on the chart. Single string = one column, array = range.
   * Undefined = no highlight.
   */
  highlightTimes?: string[];

  /**
   * Callback when a time column is clicked on the chart.
   */
  onTimeClick?: (timeLabel: string) => void;

  /**
   * Callback when the highlight bar is resized by dragging its edge handles.
   * Fires on drag end with the new start and end time labels.
   */
  onHighlightRangeChange?: (startLabel: string, endLabel: string) => void;

  /** Callback when pinned entities change in the chart */
  onEntityPin?: (names: string[]) => void;
}

const ZOOM_SCALE_EXTENT: [number, number] = [0.1, 10];
const ZOOM_STEP = 1.3;
const ZOOM_TRANSITION_MS = 300;

const SpreadLineChart = forwardRef<SpreadLineChartHandle, SpreadLineChartProps>(function SpreadLineChart(
  {
    data,
    config,
    onBlockExpand,
    onFilterChange,
    className = '',
    resetKey = 0,
    yearsFilter = 1,
    crossingOnly = false,
    onZoomChange,
    highlightTimes,
    onTimeClick,
    onHighlightRangeChange,
    onEntityPin
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visualizerRef = useRef<SpreadLinesVisualizer | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const isDraggingHighlightRef = useRef(false);

  // Refs for callbacks - prevents re-init when callback identity changes
  const onBlockExpandRef = useCallbackRef(onBlockExpand);
  const onFilterChangeRef = useCallbackRef(onFilterChange);
  const onZoomChangeRef = useCallbackRef(onZoomChange);
  const onTimeClickRef = useCallbackRef(onTimeClick);
  const onHighlightRangeChangeRef = useCallbackRef(onHighlightRangeChange);
  const onEntityPinRef = useCallbackRef(onEntityPin);

  // Refs for filter values - allows D3 to access current values without triggering React re-init
  const yearsFilterRef = useValueRef(yearsFilter);
  const crossingOnlyRef = useValueRef(crossingOnly);

  // Expose zoom methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        const svg = svgRef.current;
        const zoom = zoomBehaviorRef.current;
        if (!svg || !zoom) return;
        d3.select(svg).transition().duration(ZOOM_TRANSITION_MS).call(zoom.scaleBy, ZOOM_STEP);
      },
      zoomOut: () => {
        const svg = svgRef.current;
        const zoom = zoomBehaviorRef.current;
        if (!svg || !zoom) return;
        d3.select(svg)
          .transition()
          .duration(ZOOM_TRANSITION_MS)
          .call(zoom.scaleBy, 1 / ZOOM_STEP);
      },
      zoomToFit: () => {
        const svg = svgRef.current;
        const zoom = zoomBehaviorRef.current;
        if (!svg || !zoom) return;
        d3.select(svg).transition().duration(ZOOM_TRANSITION_MS).call(zoom.transform, d3.zoomIdentity);
      },
      getZoomLevel: () => Math.round(zoomTransformRef.current.k * 100)
    }),
    []
  );

  /**
   * Initialize or reinitialize the D3 visualization.
   *
   * IMPORTANT: This only runs when data or config changes.
   * Filter changes are handled separately by D3 via applyFilter().
   */
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const initVisualization = useCallback(() => {
    if (!svgRef.current || !data) return;

    // Destroy existing visualization
    if (visualizerRef.current) {
      visualizerRef.current.destroy();
      visualizerRef.current = null;
    }

    // Clear SVG and remove old zoom behavior
    svgRef.current.innerHTML = '';
    zoomBehaviorRef.current = null;
    zoomTransformRef.current = d3.zoomIdentity;

    // Create merged config - ensure content settings are properly merged
    const defaultConfig = createDefaultConfig();
    const mergedConfig: SpreadLineConfig = {
      ...defaultConfig,
      ...config,
      content: {
        ...defaultConfig.content,
        ...config?.content
      }
    };

    // Create visualizer
    const visualizer = new SpreadLinesVisualizer(data, mergedConfig);

    // Set callbacks using refs so they always use the latest version
    visualizer.onBlockExpand = (blockId, expanded) => onBlockExpandRef.current?.(blockId, expanded);
    visualizer.onFilterChange = names => onFilterChangeRef.current?.(names);
    visualizer.onEntityPin = name => onEntityPinRef.current?.(name);

    // Render visualization into SVG
    visualizer.visualize(svgRef.current);

    // Set viewBox so SVG scales to fit container width, height from aspect ratio
    const svg = svgRef.current;
    const w = svg.getAttribute('width');
    const h = svg.getAttribute('height');
    if (w && h) {
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    // Wrap all existing SVG children in a zoom-layer <g>
    const svgSelection = d3.select(svg);
    const zoomLayer = svgSelection.append('g').attr('class', 'zoom-layer');
    // Move all children except the zoom-layer itself into it
    const children = Array.from(svg.childNodes).filter(node => node !== zoomLayer.node());
    children.forEach(child => zoomLayer.node()!.appendChild(child));

    // Set up d3-zoom on the SVG
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(ZOOM_SCALE_EXTENT)
      .filter((event: Event) => {
        // Only allow zoom/pan when Ctrl key is held
        if (event instanceof WheelEvent || event instanceof MouseEvent) {
          return event.ctrlKey || event.metaKey;
        }
        return false;
      })
      .wheelDelta((event: WheelEvent) => {
        const direction = event.deltaY > 0 ? -1 : 1;
        return direction * Math.log(ZOOM_STEP);
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        zoomLayer.attr('transform', event.transform.toString());
        zoomTransformRef.current = event.transform;
        onZoomChangeRef.current?.(Math.round(event.transform.k * 100));
      });

    svgSelection.call(zoom);
    // Prevent Ctrl+wheel from also scrolling/zooming the page
    // Use a separate namespace so we don't overwrite d3-zoom's own wheel.zoom handler
    svgSelection.on(
      'wheel.preventCtrl',
      function (event: WheelEvent) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
        }
      },
      { passive: false } as any
    );

    zoomBehaviorRef.current = zoom;

    // Apply initial filter settings using refs (doesn't add to dependencies)
    visualizer.applyFilter(yearsFilterRef.current, crossingOnlyRef.current);

    visualizerRef.current = visualizer;
  }, [data, config]); // ONLY data and config - filters handled by D3

  /**
   * Initialize on mount and when resetKey changes
   */
  useEffect(() => {
    initVisualization();

    return () => {
      // Cleanup on unmount
      if (visualizerRef.current) {
        visualizerRef.current.destroy();
        visualizerRef.current = null;
      }
    };
  }, [initVisualization, resetKey]);

  /**
   * Handle filter changes via D3 (not React re-render).
   * This runs when filter props change, calling D3's applyFilter directly.
   * The visualization instance is NOT recreated - D3 just updates visibility.
   */
  useEffect(() => {
    if (visualizerRef.current) {
      visualizerRef.current.applyFilter(yearsFilter, crossingOnly);
    }
  }, [yearsFilter, crossingOnly]);

  /**
   * Handle highlight time changes via D3 (not React re-render).
   * Renders a semi-transparent vertical bar spanning the highlighted time range,
   * with draggable left/right handles for resizing the range.
   *
   * During drag: D3 visuals update directly (no React state change).
   * On drag end: fires onHighlightRangeChange callback to sync React state.
   */
  useEffect(() => {
    // Skip re-init while user is dragging — D3 manages visuals directly during drag
    if (isDraggingHighlightRef.current) return;

    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoomLayer = svg.select('.zoom-layer');
    if (zoomLayer.empty()) return;

    // Remove existing highlight elements
    zoomLayer.selectAll('.time-highlight-bar').remove();
    zoomLayer.selectAll('.time-highlight-handle').remove();

    if (!highlightTimes || highlightTimes.length === 0 || !data) return;

    const storylineContainer = zoomLayer.select('#storyline-container');
    if (storylineContainer.empty()) return;

    // Find matching time labels for first and last in range
    const firstLabel = data.timeLabels.find(t => t.label === highlightTimes[0]);
    const lastLabel = data.timeLabels.find(t => t.label === highlightTimes[highlightTimes.length - 1]);
    if (!firstLabel || !lastLabel) return;

    const bandWidth = data.bandWidth;
    const heightExtent = data.heightExtents[1] - data.heightExtents[0];
    const barY = data.heightExtents[0] - 20;
    const barHeight = heightExtent + 40;
    const barX = firstLabel.posX - bandWidth / 2;
    const barWidth = lastLabel.posX - firstLabel.posX + bandWidth;

    // Track current label indices during drag
    let currentStartIdx = data.timeLabels.findIndex(t => t.label === highlightTimes[0]);
    let currentEndIdx = data.timeLabels.findIndex(t => t.label === highlightTimes[highlightTimes.length - 1]);
    if (currentStartIdx === -1) currentStartIdx = 0;
    if (currentEndIdx === -1) currentEndIdx = data.timeLabels.length - 1;

    // Helper: find nearest time label index by x position
    const findNearestLabelIdx = (x: number): number => {
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < data.timeLabels.length; i++) {
        const dist = Math.abs(data.timeLabels[i].posX - x);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      return nearest;
    };

    // Update bar and handle positions from current indices
    const updateVisuals = () => {
      const startX = data.timeLabels[currentStartIdx].posX - bandWidth / 2;
      const endX = data.timeLabels[currentEndIdx].posX + bandWidth / 2;
      const width = endX - startX;
      storylineContainer.select('.time-highlight-bar').attr('x', startX).attr('width', width);
      storylineContainer.select('.time-highlight-handle-left').attr('x', startX - SPREADLINE_HIGHLIGHT_HANDLE_WIDTH / 2);
      storylineContainer.select('.time-highlight-handle-right').attr('x', endX - SPREADLINE_HIGHLIGHT_HANDLE_WIDTH / 2);
    };

    // Create highlight bar (on top of content for reliable drag; semi-transparent so content shows through)
    const bar = storylineContainer
      .append('rect')
      .attr('class', 'time-highlight-bar')
      .attr('x', barX)
      .attr('y', barY)
      .attr('width', barWidth)
      .attr('height', barHeight)
      .attr('fill', SPREADLINE_HIGHLIGHT_FILL)
      .attr('stroke', SPREADLINE_HIGHLIGHT_STROKE)
      .attr('stroke-width', 1)
      .attr('cursor', 'grab')
      .attr('opacity', 0);

    bar.transition().duration(300).attr('opacity', 1);

    // Helper: fire range change callback with current indices
    const fireRangeChange = () => {
      onHighlightRangeChangeRef.current?.(data.timeLabels[currentStartIdx].label, data.timeLabels[currentEndIdx].label);
    };

    // D3 drag for left handle
    const leftDrag = d3
      .drag<SVGRectElement, unknown>()
      .container(function () {
        return storylineContainer.node() as SVGGElement;
      })
      .on('start', event => {
        event.sourceEvent.stopPropagation();
        event.sourceEvent.preventDefault();
        isDraggingHighlightRef.current = true;
        document.body.style.cursor = 'ew-resize';
      })
      .on('drag', event => {
        const idx = findNearestLabelIdx(event.x);
        if (idx <= currentEndIdx) {
          currentStartIdx = idx;
          updateVisuals();
          fireRangeChange();
        }
      })
      .on('end', () => {
        isDraggingHighlightRef.current = false;
        document.body.style.cursor = '';
        fireRangeChange();
      });

    // D3 drag for right handle
    const rightDrag = d3
      .drag<SVGRectElement, unknown>()
      .container(function () {
        return storylineContainer.node() as SVGGElement;
      })
      .on('start', event => {
        event.sourceEvent.stopPropagation();
        event.sourceEvent.preventDefault();
        isDraggingHighlightRef.current = true;
        document.body.style.cursor = 'ew-resize';
      })
      .on('drag', event => {
        const idx = findNearestLabelIdx(event.x);
        if (idx >= currentStartIdx) {
          currentEndIdx = idx;
          updateVisuals();
          fireRangeChange();
        }
      })
      .on('end', () => {
        isDraggingHighlightRef.current = false;
        document.body.style.cursor = '';
        fireRangeChange();
      });

    // D3 drag for panning the highlight bar (shifts entire range left/right)
    let panStartIdx = 0;
    let panOrigStart = 0;
    let panOrigEnd = 0;
    const panDrag = d3
      .drag<SVGRectElement, unknown>()
      .container(function () {
        return storylineContainer.node() as SVGGElement;
      })
      .on('start', event => {
        event.sourceEvent.stopPropagation();
        event.sourceEvent.preventDefault();
        isDraggingHighlightRef.current = true;
        document.body.style.cursor = 'grabbing';
        bar.attr('cursor', 'grabbing');
        panStartIdx = findNearestLabelIdx(event.x);
        panOrigStart = currentStartIdx;
        panOrigEnd = currentEndIdx;
      })
      .on('drag', event => {
        const idx = findNearestLabelIdx(event.x);
        const delta = idx - panStartIdx;
        const rangeSize = panOrigEnd - panOrigStart;
        let newStart = panOrigStart + delta;
        let newEnd = panOrigEnd + delta;
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeSize;
        }
        if (newEnd >= data.timeLabels.length) {
          newEnd = data.timeLabels.length - 1;
          newStart = newEnd - rangeSize;
        }
        currentStartIdx = newStart;
        currentEndIdx = newEnd;
        updateVisuals();
        fireRangeChange();
      })
      .on('end', () => {
        isDraggingHighlightRef.current = false;
        document.body.style.cursor = '';
        bar.attr('cursor', 'grab');
        fireRangeChange();
      });

    bar.call(panDrag);

    // Left handle (on top of content for interaction)
    storylineContainer
      .append('rect')
      .attr('class', 'time-highlight-handle time-highlight-handle-left')
      .attr('x', barX - SPREADLINE_HIGHLIGHT_HANDLE_WIDTH / 2)
      .attr('y', barY)
      .attr('width', SPREADLINE_HIGHLIGHT_HANDLE_WIDTH)
      .attr('height', barHeight)
      .attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_COLOR)
      .attr('cursor', 'ew-resize')
      .attr('rx', 2)
      .on('mouseenter', function () {
        d3.select(this).attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_COLOR);
      })
      .call(leftDrag);

    // Right handle (on top of content for interaction)
    storylineContainer
      .append('rect')
      .attr('class', 'time-highlight-handle time-highlight-handle-right')
      .attr('x', barX + barWidth - SPREADLINE_HIGHLIGHT_HANDLE_WIDTH / 2)
      .attr('y', barY)
      .attr('width', SPREADLINE_HIGHLIGHT_HANDLE_WIDTH)
      .attr('height', barHeight)
      .attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_COLOR)
      .attr('cursor', 'ew-resize')
      .attr('rx', 2)
      .on('mouseenter', function () {
        d3.select(this).attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', SPREADLINE_HIGHLIGHT_HANDLE_COLOR);
      })
      .call(rightDrag);
  }, [highlightTimes, data]);

  /**
   * Set up click targets on time columns for range expansion.
   * Invisible rects behind content — only receive clicks on empty areas.
   */
  useEffect(() => {
    if (!svgRef.current || !data || data.timeLabels.length === 0) return;

    const svg = d3.select(svgRef.current);
    const storylineContainer = svg.select('.zoom-layer #storyline-container');
    if (storylineContainer.empty()) return;

    storylineContainer.selectAll('.time-click-receptor').remove();

    const bandWidth = data.bandWidth;
    const heightExtent = data.heightExtents[1] - data.heightExtents[0];

    data.timeLabels.forEach(tl => {
      storylineContainer
        .insert('rect', ':first-child')
        .attr('class', 'time-click-receptor')
        .attr('x', tl.posX - bandWidth / 2)
        .attr('y', data.heightExtents[0] - 20)
        .attr('width', bandWidth)
        .attr('height', heightExtent + 40)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('click', () => onTimeClickRef.current?.(tl.label));
    });
  }, [data]);

  /**
   * Handle window resize
   */
  useEffect(() => {
    const handleResize = () => {
      // For now, we don't auto-resize. The visualization has fixed dimensions
      // based on the data. If needed, we could reinitialize here.
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className={`spreadline-chart relative h-full w-full ${className}`}>
      <svg
        ref={svgRef}
        className="spreadline-svg h-full w-full"
        style={{
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      />
    </div>
  );
});

export default SpreadLineChart;

/**
 * Utility hook to access the D3 visualizer instance
 * Useful for advanced customization or imperative actions
 */
export function useSpreadLineVisualizer(data: SpreadLineData | null, config?: Partial<SpreadLineConfig>) {
  const visualizerRef = useRef<SpreadLinesVisualizer | null>(null);

  const createVisualizer = useCallback(
    (svgElement: SVGSVGElement) => {
      if (!data) return null;

      const mergedConfig = { ...createDefaultConfig(), ...config };
      const visualizer = new SpreadLinesVisualizer(data, mergedConfig);
      visualizer.visualize(svgElement);
      visualizerRef.current = visualizer;
      return visualizer;
    },
    [data, config]
  );

  const destroyVisualizer = useCallback(() => {
    if (visualizerRef.current) {
      visualizerRef.current.destroy();
      visualizerRef.current = null;
    }
  }, []);

  /* eslint-disable react-hooks/refs */
  return {
    visualizer: visualizerRef.current,
    createVisualizer,
    destroyVisualizer
  };
  /* eslint-enable react-hooks/refs */
}
