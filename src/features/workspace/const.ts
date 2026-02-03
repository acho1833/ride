/**
 * Workspace Graph Constants
 *
 * Configuration for the D3 force-directed graph.
 */

/**
 * Graph layout and physics configuration.
 */
export const GRAPH_CONFIG = {
  /** Node square size (half-width) in pixels */
  nodeRadius: 20,
  /** Entity icon size in pixels */
  iconSize: 32,
  /** Target distance between linked nodes */
  linkDistance: 180,
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
  saveDebounceMs: 500,
  /** Default node fill color (teal) */
  nodeColor: 'hsl(175, 40%, 45%)',
  /** Node fill color when selected (blue) */
  nodeColorSelected: 'hsl(210, 70%, 50%)'
} as const;

/**
 * Rectangle selection configuration.
 */
export const SELECTION_CONFIG = {
  /** Minimum drag distance in pixels to trigger rectangle selection vs click */
  minDragDistance: 5,
  /** Selection rectangle fill color (semi-transparent blue) */
  rectFill: 'rgba(59, 130, 246, 0.2)',
  /** Selection rectangle stroke color */
  rectStroke: 'rgba(59, 130, 246, 0.8)',
  /** Selection rectangle stroke width */
  rectStrokeWidth: 1,
  /** Selection rectangle stroke dash pattern */
  rectStrokeDash: '4,2'
} as const;
