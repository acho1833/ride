/**
 * Workspace Graph Types
 *
 * Type definitions for the D3 force-directed graph.
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import type { Entity } from '@/models/entity.model';

/**
 * Graph node extending Entity with D3 simulation properties.
 */
export type WorkspaceGraphNode = Entity &
  SimulationNodeDatum & {
    fx?: number | null;
    fy?: number | null;
  };

/**
 * Graph link connecting two nodes.
 */
export interface WorkspaceGraphLink extends SimulationLinkDatum<WorkspaceGraphNode> {
  source: string | WorkspaceGraphNode;
  target: string | WorkspaceGraphNode;
}

/**
 * Complete graph data structure.
 */
export interface WorkspaceGraphData {
  nodes: WorkspaceGraphNode[];
  links: WorkspaceGraphLink[];
}

/**
 * Convert workspace data to graph data format.
 */
export function toGraphData(workspace: {
  entityList: Array<{ id: string; labelNormalized: string; type: string; x?: number; y?: number }>;
  relationshipList: Array<{ sourceEntityId: string; relatedEntityId: string }>;
}): WorkspaceGraphData {
  const nodes: WorkspaceGraphNode[] = workspace.entityList.map(entity => ({
    ...entity,
    fx: null,
    fy: null
  }));

  const links: WorkspaceGraphLink[] = workspace.relationshipList.map(rel => ({
    source: rel.sourceEntityId,
    target: rel.relatedEntityId
  }));

  return { nodes, links };
}

/**
 * Preview node with source tracking.
 * Extends Entity with the source entity that revealed this node.
 */
export type PreviewNode = Entity & {
  /** The source entity ID that revealed this preview node */
  sourceEntityId: string;
};

/**
 * Link between a preview entity and a graph entity.
 * Used to render connections from preview nodes to existing graph entities.
 */
export interface PreviewLink {
  /** Preview entity ID (source of the link) */
  previewEntityId: string;
  /** Graph entity ID (target of the link) */
  graphEntityId: string;
}

/**
 * Grouped preview data for entities exceeding threshold.
 */
export interface PreviewGroup {
  entityType: string;
  entities: PreviewNode[];
  count: number;
  /** The source entity ID for this group */
  sourceEntityId: string;
}

/**
 * Preview state passed from workspace to graph components.
 * Supports multiple source entities for accumulated preview expansion.
 */
export interface PreviewState {
  isActive: boolean;
  /** All source entity IDs that have been expanded */
  sourceEntityIds: string[];
  /** Position of each source entity (keyed by entity ID) */
  sourcePositions: Record<string, { x: number; y: number }>;
  /** Individual preview entities (when count <= threshold) */
  nodes: PreviewNode[];
  /** Grouped by type (when count > threshold) */
  groups: PreviewGroup[];
  /** Links from preview entities to existing graph entities */
  links: PreviewLink[];
}
