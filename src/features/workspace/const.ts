/**
 * Workspace Graph Constants
 *
 * Configuration for the D3 force-directed graph.
 */

/**
 * Graph layout and physics configuration.
 */
export const GRAPH_CONFIG = {
  /** Node circle radius in pixels */
  nodeRadius: 20,
  /** Entity icon size in pixels */
  iconSize: 32,
  /** Target distance between linked nodes */
  linkDistance: 120,
  /** Repulsion strength between nodes (negative = repel) */
  chargeStrength: -400,
  /** Strength of centering force */
  centerForce: 0.1,
  /** Zoom scale limits */
  zoomExtent: [0.1, 4] as [number, number],
  /** Zoom scale factor for buttons */
  zoomStep: 1.3,
  /** Padding around nodes when fitting to view */
  fitPadding: 50,
  /** Debounce delay for saving view state in milliseconds */
  saveDebounceMs: 500
} as const;
