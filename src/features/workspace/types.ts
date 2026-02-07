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
 * Grouped preview data for entities exceeding threshold.
 */
export interface PreviewGroup {
  entityType: string;
  entities: Entity[];
  count: number;
}

/**
 * Preview state passed from workspace to graph components.
 */
export interface PreviewState {
  isActive: boolean;
  sourceEntityId: string;
  sourcePosition: { x: number; y: number };
  /** Individual preview entities (when count <= threshold) */
  nodes: Entity[];
  /** Grouped by type (when count > threshold) */
  groups: PreviewGroup[];
}
