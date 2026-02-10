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
  zoomExtent: [0.5, 3] as [number, number],
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

/**
 * Preview mode configuration.
 */
/**
 * Smart coordinate placement configuration.
 * Used for placing large numbers of entities without force simulation.
 */
export const PLACEMENT_CONFIG = {
  /** Cell size multiplier applied to nodeRadius for occupancy grid */
  cellSizeMultiplier: 5,
  /** Maximum time for placement algorithm (ms) */
  maxTimeMs: 500,
  /** Check timeout every N entities */
  timeoutCheckInterval: 50,
  /** Gap between clusters (in grid cells) */
  clusterPadding: 1,
  /** Max spiral iterations per entity before giving up */
  maxSpiralIterations: 300,
  /** Min new entities to use placement algorithm instead of force layout */
  forceLayoutThreshold: 500
} as const;

/**
 * Viewport culling configuration.
 * Hides off-screen nodes/links via display:none to reduce paint cost.
 */
export const CULLING_CONFIG = {
  /** Minimum node count to activate viewport culling */
  nodeThreshold: 500,
  /** Extra padding around viewport in world coordinates (prevents pop-in) */
  viewportPadding: 200
} as const;

/**
 * Minimap configuration.
 * Canvas-based overview showing all nodes as dots with a viewport rectangle.
 */
export const MINIMAP_CONFIG = {
  /** Minimap canvas width in pixels */
  width: 180,
  /** Minimap canvas height in pixels */
  height: 120,
  /** Dot radius for each node in minimap */
  dotRadius: 2,
  /** Padding around node bounds in world coordinates */
  padding: 50,
  /** Viewport rectangle stroke color */
  viewportStroke: 'rgba(59, 130, 246, 0.8)',
  /** Viewport rectangle fill color */
  viewportFill: 'rgba(59, 130, 246, 0.1)',
  /** Minimap background color */
  background: 'hsl(0, 0%, 90%)',
  /** Minimap border color */
  borderColor: 'rgba(0, 0, 0, 0.15)'
} as const;

export const PREVIEW_CONFIG = {
  /** Maximum entities to show as individual nodes before grouping */
  threshold: 50,
  /** Preview node opacity (0-1) */
  nodeOpacity: 0.6,
  /** Preview node border color */
  borderColor: 'hsl(0, 0%, 60%)',
  /** Preview connecting line dash pattern */
  lineDash: '4,4',
  /** Distance from source node for preview nodes */
  previewDistance: 120
} as const;
