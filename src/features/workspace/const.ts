/**
 * Workspace Graph Constants
 *
 * Configuration and sample data generator for the D3 graph.
 */

import type { GraphData, GraphNode, GraphLink } from './types';

/**
 * Graph layout and physics configuration.
 */
export const GRAPH_CONFIG = {
  /** Node circle radius in pixels */
  nodeRadius: 20,
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
  fitPadding: 50
} as const;

/**
 * Color palette for nodes (20 distinct colors).
 */
const NODE_COLORS = [
  'hsl(0, 70%, 50%)', // red
  'hsl(20, 80%, 50%)', // orange-red
  'hsl(35, 85%, 50%)', // orange
  'hsl(50, 80%, 45%)', // gold
  'hsl(65, 70%, 40%)', // yellow-green
  'hsl(90, 55%, 40%)', // lime
  'hsl(120, 50%, 40%)', // green
  'hsl(150, 55%, 40%)', // sea green
  'hsl(175, 60%, 40%)', // teal
  'hsl(195, 70%, 45%)', // cyan
  'hsl(210, 70%, 50%)', // blue
  'hsl(230, 65%, 55%)', // indigo
  'hsl(260, 60%, 55%)', // purple
  'hsl(280, 55%, 50%)', // violet
  'hsl(300, 50%, 50%)', // magenta
  'hsl(320, 60%, 50%)', // pink
  'hsl(340, 65%, 50%)', // rose
  'hsl(15, 75%, 45%)', // rust
  'hsl(185, 50%, 35%)', // dark teal
  'hsl(245, 50%, 50%)' // slate blue
] as const;

/**
 * Simple hash function for strings.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a node based on its name.
 */
export function getNodeColor(name: string): string {
  const index = hashString(name) % NODE_COLORS.length;
  return NODE_COLORS[index];
}

/**
 * Sample names for graph nodes.
 */
const SAMPLE_NAMES = [
  'John Smith',
  'Jane Doe',
  'Bob Johnson',
  'Alice Williams',
  'Charlie Brown',
  'Diana Prince',
  'Edward Norton',
  'Fiona Apple',
  'George Miller',
  'Hannah Montana'
] as const;

/**
 * Generates random sample graph data.
 *
 * @returns GraphData with 10 nodes, ~50% connected, 2 isolated nodes guaranteed
 */
export function generateSampleData(): GraphData {
  // Shuffle names to randomize node order
  const shuffledNames = [...SAMPLE_NAMES].sort(() => Math.random() - 0.5);

  // Create nodes
  const nodes: GraphNode[] = shuffledNames.map((name, index) => ({
    id: `node-${index}`,
    name
  }));

  // Reserve first 2 nodes as isolated (no connections)
  const isolatedCount = 2;
  const connectableNodes = nodes.slice(isolatedCount);

  // Generate links for ~50% connectivity
  // With 8 connectable nodes, we want roughly 4-6 links
  const links: GraphLink[] = [];
  const targetLinkCount = Math.floor(connectableNodes.length * 0.6);

  // Create random connections
  const usedPairs = new Set<string>();

  while (links.length < targetLinkCount) {
    const sourceIdx = Math.floor(Math.random() * connectableNodes.length);
    const targetIdx = Math.floor(Math.random() * connectableNodes.length);

    if (sourceIdx === targetIdx) continue;

    const pairKey = [sourceIdx, targetIdx].sort().join('-');
    if (usedPairs.has(pairKey)) continue;

    usedPairs.add(pairKey);
    links.push({
      source: connectableNodes[sourceIdx].id,
      target: connectableNodes[targetIdx].id
    });
  }

  return { nodes, links };
}
