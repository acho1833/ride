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
}

const ZOOM_SCALE_EXTENT: [number, number] = [0.1, 10];
const ZOOM_STEP = 1.3;
const ZOOM_TRANSITION_MS = 300;

const SpreadLineChart = forwardRef<SpreadLineChartHandle, SpreadLineChartProps>(function SpreadLineChart(
  { data, config, onBlockExpand, onFilterChange, className = '', resetKey = 0, yearsFilter = 1, crossingOnly = false, onZoomChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visualizerRef = useRef<SpreadLinesVisualizer | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // Refs for callbacks - prevents re-init when callback identity changes
  const onBlockExpandRef = useCallbackRef(onBlockExpand);
  const onFilterChangeRef = useCallbackRef(onFilterChange);
  const onZoomChangeRef = useCallbackRef(onZoomChange);

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
          fontFamily: 'system-ui, -apple-system, sans-serif'
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
