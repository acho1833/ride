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
  /** Hop distance from ego: 0 = ego, 1 = direct, 2 = indirect */
  hopDistance?: 0 | 1 | 2;
  /** Entity category: internal (same affiliation) or external */
  category?: 'internal' | 'external' | 'ego';
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

/**
 * Extract sorted unique time blocks from topology data.
 */
export function getTimeBlocks(rawData: { topology: { time: string }[] }): string[] {
  const times = [...new Set(rawData.topology.map(t => t.time))];
  return times.sort((a, b) => a.localeCompare(b));
}

/**
 * Transform spreadline raw data into graph nodes and links for a SINGLE time block.
 *
 * Uses `groups[time]` to determine hop distance per entity:
 *   Index 0 = external 2-hop, Index 1 = external 1-hop,
 *   Index 2 = ego, Index 3 = internal 1-hop, Index 4 = internal 2-hop
 */
export function transformSpreadlineToGraphByTime(
  rawData: {
    egoId: string;
    egoName: string;
    entities: Record<string, { name: string; category: string }>;
    topology: { sourceId: string; targetId: string; time: string; weight: number }[];
    groups: Record<string, string[][]>;
  },
  time: string
): { nodes: SpreadlineGraphNode[]; links: SpreadlineGraphLink[] } {
  // 1. Filter topology to this time block
  const timeTopology = rawData.topology.filter(t => t.time === time);

  // 2. Collect active entity IDs
  const activeIds = new Set<string>();
  activeIds.add(rawData.egoId);
  for (const entry of timeTopology) {
    activeIds.add(entry.sourceId);
    activeIds.add(entry.targetId);
  }

  // 3. Determine hop distance from groups[time]
  const groups = rawData.groups[time] ?? [[], [], [], [], []];
  const hopMap = new Map<string, { hop: 0 | 1 | 2; category: 'internal' | 'external' | 'ego' }>();
  hopMap.set(rawData.egoId, { hop: 0, category: 'ego' });
  for (const id of groups[1] ?? []) hopMap.set(id, { hop: 1, category: 'external' });
  for (const id of groups[3] ?? []) hopMap.set(id, { hop: 1, category: 'internal' });
  for (const id of groups[0] ?? []) hopMap.set(id, { hop: 2, category: 'external' });
  for (const id of groups[4] ?? []) hopMap.set(id, { hop: 2, category: 'internal' });

  // 4. Build nodes
  const nodes: SpreadlineGraphNode[] = [];

  // Ego node
  nodes.push({
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    collaborationCount: 0,
    hopDistance: 0,
    category: 'ego'
  });

  // Entity nodes (only active ones)
  for (const id of activeIds) {
    if (id === rawData.egoId) continue;
    const entity = rawData.entities[id];
    if (!entity) continue;
    const info = hopMap.get(id) ?? { hop: 2, category: 'external' as const };
    nodes.push({
      id,
      name: entity.name,
      isEgo: false,
      collaborationCount: timeTopology.filter(t => t.sourceId === id || t.targetId === id).length,
      hopDistance: info.hop,
      category: info.category
    });
  }

  // 5. Build links (deduplicated within this time block)
  const linkSet = new Set<string>();
  const links: SpreadlineGraphLink[] = [];
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const entry of timeTopology) {
    const key = [entry.sourceId, entry.targetId].sort().join('::');
    if (!linkSet.has(key) && nodeIds.has(entry.sourceId) && nodeIds.has(entry.targetId)) {
      linkSet.add(key);
      links.push({ source: entry.sourceId, target: entry.targetId });
    }
  }

  return { nodes, links };
}
