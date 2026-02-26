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
  const linkMap = new Map<
    string,
    { source: string; target: string; weight: number; paperCount: number; years: Set<string> }
  >();

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
    totalCitations: 0,
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

  // 3. Build hop map — use closest (minimum) hop across all times
  const hopMap = new Map<string, { hop: 0 | 1 | 2; category: 'internal' | 'external' | 'ego' }>();
  hopMap.set(rawData.egoId, { hop: 0, category: 'ego' });

  for (const time of times) {
    const groups = rawData.groups[time] ?? [[], [], [], [], []];
    const timeHops: [string, 0 | 1 | 2, 'internal' | 'external'][] = [
      ...(groups[1] ?? []).map(id => [id, 1 as const, 'external' as const] as [string, 1, 'external']),
      ...(groups[3] ?? []).map(id => [id, 1 as const, 'internal' as const] as [string, 1, 'internal']),
      ...(groups[0] ?? []).map(id => [id, 2 as const, 'external' as const] as [string, 2, 'external']),
      ...(groups[4] ?? []).map(id => [id, 2 as const, 'internal' as const] as [string, 2, 'internal'])
    ];
    for (const [id, hop, category] of timeHops) {
      const existing = hopMap.get(id);
      if (!existing || hop < existing.hop) {
        hopMap.set(id, { hop, category });
      }
    }
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
    const info = hopMap.get(id) ?? { hop: 2, category: 'external' as const };
    nodes.push({
      id,
      name: entity.name,
      isEgo: false,
      collaborationCount: rangeTopology.filter(t => t.sourceId === id || t.targetId === id).length,
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
