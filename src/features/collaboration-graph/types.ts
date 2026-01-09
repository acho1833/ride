/**
 * Collaboration Graph Types
 *
 * Type definitions for the .gx collaboration network visualization.
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

/**
 * A single collaboration event (year-based).
 */
export interface Collaboration {
  year: number;
}

/**
 * A collaborator in the network.
 */
export interface Collaborator {
  id: string;
  name: string;
  collaborations: Collaboration[];
}

/**
 * Target person (center of the graph).
 */
export interface Target {
  id: string;
  name: string;
}

/**
 * Connection between two people ("who knows who").
 */
export interface Connection {
  source: string;
  target: string;
}

/**
 * Complete .gx file data structure.
 */
export interface CollaborationData {
  target: Target;
  collaborators: Collaborator[];
  connections: Connection[];
}

/**
 * Graph node with D3 simulation properties.
 */
export interface CollaborationNode extends SimulationNodeDatum {
  id: string;
  name: string;
  collaborationCount: number;
  isTarget: boolean;
  hop: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Graph link for D3 simulation.
 */
export interface CollaborationLink extends SimulationLinkDatum<CollaborationNode> {
  source: string | CollaborationNode;
  target: string | CollaborationNode;
}

/**
 * Color tier for collaboration frequency.
 */
export interface ColorTier {
  min: number;
  max: number;
  color: string;
  label: string;
}
