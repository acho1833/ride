/**
 * Workspace Graph Types
 *
 * Type definitions for the D3 force-directed graph.
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

/**
 * Graph node with position and fixed coordinates for dragging.
 */
export interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Graph link connecting two nodes.
 */
export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

/**
 * Complete graph data structure.
 */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
