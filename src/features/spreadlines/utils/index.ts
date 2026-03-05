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
  /** Sum of citation weights across all links involving this node */
  totalCitations: number;
  /** Hop distance from ego: 0 = ego, 1 = direct, 2+ = indirect */
  hopDistance?: number;
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
  /** Aggregated citation count across all co-authored papers */
  weight: number;
  /** Number of distinct co-authored papers */
  paperCount: number;
  /** Years in which the collaboration occurred */
  years: string[];
}

/** Deduplicate topology entries into aggregated links, filtering by valid node IDs */
export function deduplicateLinks(
  entries: { sourceId: string; targetId: string; time: string; weight: number }[],
  nodeIds: Set<string>
): SpreadlineGraphLink[] {
  const linkMap = new Map<string, { source: string; target: string; weight: number; paperCount: number; years: Set<string> }>();

  for (const entry of entries) {
    if (!nodeIds.has(entry.sourceId) || !nodeIds.has(entry.targetId)) continue;
    const key = [entry.sourceId, entry.targetId].sort().join('::');
    const existing = linkMap.get(key);
    if (existing) {
      existing.weight += entry.weight;
      existing.paperCount += 1;
      existing.years.add(entry.time);
    } else {
      const [source, target] = key.split('::');
      linkMap.set(key, {
        source,
        target,
        weight: entry.weight,
        paperCount: 1,
        years: new Set([entry.time])
      });
    }
  }

  return Array.from(linkMap.values()).map(l => ({
    source: l.source,
    target: l.target,
    weight: l.weight,
    paperCount: l.paperCount,
    years: Array.from(l.years).sort()
  }));
}

/** Compute total citations per node from aggregated links */
function computeNodeCitations(links: SpreadlineGraphLink[]): Map<string, number> {
  const citations = new Map<string, number>();
  for (const link of links) {
    const s = typeof link.source === 'string' ? link.source : link.source.id;
    const t = typeof link.target === 'string' ? link.target : link.target.id;
    citations.set(s, (citations.get(s) ?? 0) + link.weight);
    citations.set(t, (citations.get(t) ?? 0) + link.weight);
  }
  return citations;
}

/**
 * Transform spreadline raw data into graph nodes and links.
 *
 * - Ego node: center of graph, marked with isEgo=true
 * - Entity nodes: one per entity, collaborationCount = unique topology entries
 * - Links: unique (sourceId, targetId) pairs from topology, deduplicated across time
 *   with aggregated weight, paperCount, and years
 */
export function transformSpreadlineToGraph(rawData: {
  egoId: string;
  egoName: string;
  entities: Record<string, { name: string }>;
  topology: { sourceId: string; targetId: string; time: string; weight: number }[];
}): { nodes: SpreadlineGraphNode[]; links: SpreadlineGraphLink[] } {
  const collabCounts = new Map<string, number>();
  for (const entry of rawData.topology) {
    collabCounts.set(entry.sourceId, (collabCounts.get(entry.sourceId) ?? 0) + 1);
    collabCounts.set(entry.targetId, (collabCounts.get(entry.targetId) ?? 0) + 1);
  }

  const egoNode: SpreadlineGraphNode = {
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    collaborationCount: 0,
    totalCitations: 0
  };

  const entityNodes: SpreadlineGraphNode[] = Object.entries(rawData.entities).map(([id, entity]) => ({
    id,
    name: entity.name,
    isEgo: false,
    collaborationCount: collabCounts.get(id) ?? 0,
    totalCitations: 0
  }));

  const nodes = [egoNode, ...entityNodes];
  const nodeIds = new Set(nodes.map(n => n.id));
  const links = deduplicateLinks(rawData.topology, nodeIds);
  const nodeCitations = computeNodeCitations(links);

  // Apply totalCitations to nodes (ego stays 0)
  for (const node of entityNodes) {
    node.totalCitations = nodeCitations.get(node.id) ?? 0;
  }

  return { nodes, links };
}

/**
 * Parse dynamic groups array into a hop map.
 *
 * Groups have `2*N+1` slots: [ext-N..ext-1, ego, int-1..int-N].
 * Ego index = N = Math.floor(groups.length / 2).
 */
function parseGroupsToHopMap(groups: string[][], egoId: string): Map<string, { hop: number; category: 'internal' | 'external' | 'ego' }> {
  const hopMap = new Map<string, { hop: number; category: 'internal' | 'external' | 'ego' }>();
  hopMap.set(egoId, { hop: 0, category: 'ego' });
  const egoIdx = Math.floor(groups.length / 2);

  for (let i = 0; i < groups.length; i++) {
    if (i === egoIdx) continue;
    const hopDist = Math.abs(i - egoIdx);
    const category: 'internal' | 'external' = i > egoIdx ? 'internal' : 'external';
    for (const id of groups[i] ?? []) {
      hopMap.set(id, { hop: hopDist, category });
    }
  }

  return hopMap;
}

/**
 * Transform spreadline raw data into graph nodes and links for a SINGLE time block.
 *
 * Uses `groups[time]` to determine hop distance per entity.
 * Groups are dynamic-length: `2*N+1` slots where N is the hop limit.
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

  // 3. Determine hop distance from groups[time] (dynamic group size)
  const groups = rawData.groups[time] ?? [];
  const hopMap = parseGroupsToHopMap(groups, rawData.egoId);

  // Build collaboration count map (O(n) instead of O(n*m))
  const collabCounts = new Map<string, number>();
  for (const entry of timeTopology) {
    collabCounts.set(entry.sourceId, (collabCounts.get(entry.sourceId) ?? 0) + 1);
    collabCounts.set(entry.targetId, (collabCounts.get(entry.targetId) ?? 0) + 1);
  }

  // 4. Build nodes
  const nodes: SpreadlineGraphNode[] = [];

  // Ego node
  nodes.push({
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    collaborationCount: 0,
    totalCitations: 0,
    hopDistance: 0,
    category: 'ego'
  });

  // Entity nodes (only active ones)
  const maxHop = Math.floor(groups.length / 2) || 2;
  for (const id of activeIds) {
    if (id === rawData.egoId) continue;
    const entity = rawData.entities[id];
    if (!entity) continue;
    const info = hopMap.get(id) ?? { hop: maxHop, category: 'external' as const };
    nodes.push({
      id,
      name: entity.name,
      isEgo: false,
      collaborationCount: collabCounts.get(id) ?? 0,
      totalCitations: 0,
      hopDistance: info.hop,
      category: info.category
    });
  }

  // 5. Build links (deduplicated within this time block, with aggregation)
  const nodeIds = new Set(nodes.map(n => n.id));
  const links = deduplicateLinks(timeTopology, nodeIds);
  const nodeCitations = computeNodeCitations(links);
  for (const node of nodes) {
    node.totalCitations = node.isEgo ? 0 : (nodeCitations.get(node.id) ?? 0);
  }

  return { nodes, links };
}

/**
 * Transform spreadline raw data into graph for MULTIPLE time blocks (range).
 *
 * Unions entities and links across all given times.
 * Hop distance = closest (minimum) hop across the time range.
 */
export function transformSpreadlineToGraphByTimes(
  rawData: {
    egoId: string;
    egoName: string;
    entities: Record<string, { name: string; category: string }>;
    topology: { sourceId: string; targetId: string; time: string; weight: number }[];
    groups: Record<string, string[][]>;
  },
  times: string[]
): { nodes: SpreadlineGraphNode[]; links: SpreadlineGraphLink[] } {
  if (times.length === 1) return transformSpreadlineToGraphByTime(rawData, times[0]);

  const timesSet = new Set(times);

  // 1. Filter topology to times in range
  const rangeTopology = rawData.topology.filter(t => timesSet.has(t.time));

  // 2. Collect active entity IDs
  const activeIds = new Set<string>();
  activeIds.add(rawData.egoId);
  for (const entry of rangeTopology) {
    activeIds.add(entry.sourceId);
    activeIds.add(entry.targetId);
  }

  // 3. Build hop map — use closest (minimum) hop across all times (dynamic group size)
  const hopMap = new Map<string, { hop: number; category: 'internal' | 'external' | 'ego' }>();
  hopMap.set(rawData.egoId, { hop: 0, category: 'ego' });

  for (const time of times) {
    const groups = rawData.groups[time] ?? [];
    const timeHopMap = parseGroupsToHopMap(groups, rawData.egoId);
    for (const [id, info] of timeHopMap) {
      if (id === rawData.egoId) continue;
      const existing = hopMap.get(id);
      if (!existing || info.hop < existing.hop) {
        hopMap.set(id, info);
      }
    }
  }

  // Build collaboration count map (O(n) instead of O(n*m))
  const collabCounts = new Map<string, number>();
  for (const entry of rangeTopology) {
    collabCounts.set(entry.sourceId, (collabCounts.get(entry.sourceId) ?? 0) + 1);
    collabCounts.set(entry.targetId, (collabCounts.get(entry.targetId) ?? 0) + 1);
  }

  // 4. Build nodes
  const nodes: SpreadlineGraphNode[] = [];
  nodes.push({
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    collaborationCount: 0,
    totalCitations: 0,
    hopDistance: 0,
    category: 'ego'
  });

  for (const id of activeIds) {
    if (id === rawData.egoId) continue;
    const entity = rawData.entities[id];
    if (!entity) continue;
    // Determine max hop from any available group for fallback
    const sampleGroups = Object.values(rawData.groups)[0] ?? [];
    const maxHop = Math.floor(sampleGroups.length / 2) || 2;
    const info = hopMap.get(id) ?? { hop: maxHop, category: 'external' as const };
    nodes.push({
      id,
      name: entity.name,
      isEgo: false,
      collaborationCount: collabCounts.get(id) ?? 0,
      totalCitations: 0,
      hopDistance: info.hop,
      category: info.category
    });
  }

  // 5. Build links (deduplicated across all times in range, with aggregation)
  const nodeIds = new Set(nodes.map(n => n.id));
  const links = deduplicateLinks(rangeTopology, nodeIds);
  const nodeCitations = computeNodeCitations(links);
  for (const node of nodes) {
    node.totalCitations = node.isEgo ? 0 : (nodeCitations.get(node.id) ?? 0);
  }

  return { nodes, links };
}

/** BFS: compute shortest distances from a start node to all reachable nodes */
export const bfsDistances = (
  startId: string,
  links: { source: string | { id: string }; target: string | { id: string } }[]
): Map<string, number> => {
  const adj = new Map<string, string[]>();
  for (const link of links) {
    const s = typeof link.source === 'string' ? link.source : link.source.id;
    const t = typeof link.target === 'string' ? link.target : link.target.id;
    if (!adj.has(s)) adj.set(s, []);
    if (!adj.has(t)) adj.set(t, []);
    adj.get(s)!.push(t);
    adj.get(t)!.push(s);
  }
  const dist = new Map<string, number>([[startId, 0]]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = dist.get(current)!;
    for (const neighbor of adj.get(current) ?? []) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, d + 1);
        queue.push(neighbor);
      }
    }
  }
  return dist;
};

/** Timeline entity for the network timeline chart */
export interface TimelineEntity {
  id: string;
  name: string;
  isEgo: boolean;
  totalActivity: number;
  lifespan: number;
  timeBlocks: Array<{
    time: string;
    citationCount: number;
  }>;
}

/**
 * Transform spreadline raw data into timeline entities.
 *
 * Each entity gets a row with time blocks where it has relations,
 * plus citation counts per block. Sorted by total activity (ego first).
 */
export function transformSpreadlineToTimeline(rawData: {
  egoId: string;
  egoName: string;
  entities: Record<string, { name: string; citations: Record<string, number> }>;
  topology: { sourceId: string; targetId: string; time: string; weight: number }[];
}): TimelineEntity[] {
  // 1. Collect active time blocks per entity from topology
  const entityTimes = new Map<string, Set<string>>();
  for (const entry of rawData.topology) {
    if (!entityTimes.has(entry.sourceId)) entityTimes.set(entry.sourceId, new Set());
    if (!entityTimes.has(entry.targetId)) entityTimes.set(entry.targetId, new Set());
    entityTimes.get(entry.sourceId)!.add(entry.time);
    entityTimes.get(entry.targetId)!.add(entry.time);
  }

  // 2. Build timeline entities
  const results: TimelineEntity[] = [];

  // Ego entity
  const egoTimes = entityTimes.get(rawData.egoId) ?? new Set<string>();
  results.push({
    id: rawData.egoId,
    name: rawData.egoName,
    isEgo: true,
    totalActivity: egoTimes.size,
    lifespan: egoTimes.size,
    timeBlocks: Array.from(egoTimes)
      .sort()
      .map(time => ({ time, citationCount: 0 }))
  });

  // Non-ego entities
  for (const [id, entity] of Object.entries(rawData.entities)) {
    const times = entityTimes.get(id) ?? new Set<string>();
    const timeBlocks = Array.from(times)
      .sort()
      .map(time => ({
        time,
        citationCount: entity.citations[time] ?? 0
      }));

    results.push({
      id,
      name: entity.name,
      isEgo: false,
      totalActivity: times.size,
      lifespan: times.size,
      timeBlocks
    });
  }

  // 3. Sort: ego first, then by totalActivity descending
  results.sort((a, b) => {
    if (a.isEgo) return -1;
    if (b.isEgo) return 1;
    return b.totalActivity - a.totalActivity;
  });

  return results;
}
