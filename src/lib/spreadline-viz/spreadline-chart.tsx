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

import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
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
}

export default function SpreadLineChart({
  data,
  config,
  onBlockExpand,
  onFilterChange,
  className = '',
  resetKey = 0,
  yearsFilter = 1,
  crossingOnly = false
}: SpreadLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visualizerRef = useRef<SpreadLinesVisualizer | null>(null);

  // Refs for callbacks - prevents re-init when callback identity changes
  const onBlockExpandRef = useCallbackRef(onBlockExpand);
  const onFilterChangeRef = useCallbackRef(onFilterChange);

  // Refs for filter values - allows D3 to access current values without triggering React re-init
  const yearsFilterRef = useValueRef(yearsFilter);
  const crossingOnlyRef = useValueRef(crossingOnly);

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

    // Clear SVG
    svgRef.current.innerHTML = '';

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

    // Render visualization
    visualizer.visualize(svgRef.current);

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
    <div ref={containerRef} className={`spreadline-chart relative ${className}`} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        className="spreadline-svg"
        style={{
          overflow: 'visible',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      />
    </div>
  );
}

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
