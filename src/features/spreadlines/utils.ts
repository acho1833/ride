/**
 * Spreadline Graph Utilities
 *
 * Transform spreadline raw data into D3-compatible graph format.
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

/** Graph node for D3 force simulation */
export interface SpreadlineGraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  isEgo: boolean;
  collaborationCount: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

/** Graph link for D3 force simulation */
export interface SpreadlineGraphLink extends SimulationLinkDatum<SpreadlineGraphNode> {
  source: string | SpreadlineGraphNode;
  target: string | SpreadlineGraphNode;
}

/**
 * Transform spreadline raw data into graph nodes and links.
 *
 * - Ego node: center of graph, marked with isEgo=true
 * - Entity nodes: one per entity, collaborationCount = unique topology entries
 * - Links: unique (sourceId, targetId) pairs from topology, deduplicated across time
 */
export function transformSpreadlineToGraph(rawData: {
  egoId: string;
  egoName: string;
  entities: Record<string, { name: string }>;
  topology: { sourceId: string; targetId: string }[];
}): { nodes: SpreadlineGraphNode[]; links: SpreadlineGraphLink[] } {
  // Count collaborations per entity
  const collabCounts = new Map<string, number>();
  const linkSet = new Set<string>();

  for (const entry of rawData.topology) {
    // Count per entity
    collabCounts.set(entry.sourceId, (collabCounts.get(entry.sourceId) ?? 0) + 1);
    collabCounts.set(entry.targetId, (collabCounts.get(entry.targetId) ?? 0) + 1);

    // Unique links (deduplicate across time)
    const key = [entry.sourceId, entry.targetId].sort().join('::');
    linkSet.add(key);
  }

  // Ego node
  const egoNode: SpreadlineGraphNode = {
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    collaborationCount: 0
  };

  // Entity nodes
  const entityNodes: SpreadlineGraphNode[] = Object.entries(rawData.entities).map(([id, entity]) => ({
    id,
    name: entity.name,
    isEgo: false,
    collaborationCount: collabCounts.get(id) ?? 0
  }));

  const nodes = [egoNode, ...entityNodes];

  // Links from deduplicated set
  const nodeIds = new Set(nodes.map(n => n.id));
  const links: SpreadlineGraphLink[] = Array.from(linkSet)
    .map(key => {
      const [source, target] = key.split('::');
      return { source, target };
    })
    .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

  return { nodes, links };
}
