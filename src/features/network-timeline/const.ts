/**
 * Network Timeline Constants
 *
 * Configuration for the .nt visualization.
 */

import type { ColorTier } from './types';

/**
 * 5-tier color scale for collaboration frequency.
 * Categorical distinct colors: blue, green, yellow, orange, red.
 */
export const COLOR_TIERS: ColorTier[] = [
  { min: 1, max: 5, color: '#3b82f6', label: '1-5' }, // Blue
  { min: 6, max: 10, color: '#22c55e', label: '6-10' }, // Green
  { min: 11, max: 15, color: '#eab308', label: '11-15' }, // Yellow
  { min: 16, max: 20, color: '#f97316', label: '16-20' }, // Orange
  { min: 21, max: Infinity, color: '#ef4444', label: '21+' } // Red
];

/**
 * Target node styling.
 */
export const TARGET_COLOR = '#8b5cf6'; // Purple for target node

/**
 * Selection highlight color.
 */
export const SELECTION_COLOR = '#ffffff';
export const SELECTION_RING_WIDTH = 3;

/**
 * Graph configuration.
 */
export const GRAPH_CONFIG = {
  /** Node radius for collaborators */
  nodeRadius: 28,
  /** Node radius for target */
  targetNodeRadius: 36,
  /** Link distance between connected nodes */
  linkDistance: 120,
  /** Charge strength (negative = repulsion) */
  chargeStrength: -400,
  /** Zoom extent [min, max] */
  zoomExtent: [0.2, 4] as [number, number],
  /** Zoom step for button controls */
  zoomStep: 1.3,
  /** Padding for fit-to-view */
  fitPadding: 60,
  /** Font size for node labels */
  labelFontSize: 11,
  /** Font size for count inside node */
  countFontSize: 14
};

/**
 * Timeline configuration.
 */
export const TIMELINE_CONFIG = {
  /** Height of timeline panel */
  panelHeight: 180,
  /** Row height per selected node */
  rowHeight: 30,
  /** Padding inside timeline */
  padding: { top: 40, right: 40, bottom: 30, left: 100 },
  /** Dot radius for collaboration markers */
  dotRadius: 5,
  /** Line width connecting consecutive years */
  lineWidth: 2
};
