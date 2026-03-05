import 'server-only';

import type { RelationRow } from './csv.utils';
import type { TopologyEntry, LineCategoryValue } from './spreadline-data.service';

export interface EntityRow {
  id: string;
  year: string;
  name: string;
  citationcount: number;
  affiliation: string;
}

export const INTERNAL: LineCategoryValue = 'internal';
export const EXTERNAL: LineCategoryValue = 'external';
export const DEFAULT_HOP_LIMIT = 2;

export function remapJHAffiliation(affiliation: string | null | undefined): string {
  if (!affiliation || typeof affiliation !== 'string') {
    return 'University of Washington, USA';
  }
  if (affiliation.includes('Berkeley')) {
    return 'University of California, Berkeley, USA';
  }
  if (affiliation.includes('PARC') || affiliation.includes('Palo Alto') || affiliation.includes('Xerox')) {
    return 'Palo Alto Research Center, USA';
  }
  if (affiliation.includes('Stanford')) {
    return 'Stanford University, USA';
  }
  if (affiliation.includes('Washington')) {
    return 'University of Washington, USA';
  }
  return affiliation;
}

/**
 * Construct ego-centric network via N-hop BFS per time slice.
 * Returns filtered relations and hop distances per entity per time block.
 */
export function constructEgoNetworks(
  data: RelationRow[],
  egoId: string,
  hopLimit: number = DEFAULT_HOP_LIMIT
): { relations: RelationRow[]; hopDistances: Record<string, Map<string, number>> } {
  const indices = new Set<number>();
  const hopDistances: Record<string, Map<string, number>> = {};

  // Group by time
  const byTime: Record<string, { row: RelationRow; idx: number }[]> = {};
  data.forEach((row, idx) => {
    const time = row.year;
    if (!byTime[time]) byTime[time] = [];
    byTime[time].push({ row, idx });
  });

  for (const [time, entries] of Object.entries(byTime)) {
    const distMap = new Map<string, number>();
    distMap.set(egoId, 0);
    let waitlist = new Set<string>([egoId]);
    const visited = new Set<string>([egoId]);
    let hop = 1;

    while (waitlist.size > 0 && hop <= hopLimit) {
      const nextWaitlist: string[] = [];

      for (const each of waitlist) {
        const sources = entries.filter(e => e.row.targetId === each);
        const targets = entries.filter(e => e.row.sourceId === each);

        const candidates: string[] = [...sources.map(e => e.row.sourceId), ...targets.map(e => e.row.targetId)];

        sources.forEach(e => indices.add(e.idx));
        targets.forEach(e => indices.add(e.idx));

        for (const c of candidates) {
          if (!visited.has(c)) {
            distMap.set(c, hop);
            visited.add(c);
            nextWaitlist.push(c);
          }
        }
      }

      waitlist = new Set(nextWaitlist);
      hop++;
    }

    hopDistances[time] = distMap;
  }

  return { relations: data.filter((_, idx) => indices.has(idx)), hopDistances };
}

/**
 * Build author network with category assignments and dynamic group assignments.
 *
 * Groups array has `2*hopLimit + 1` slots:
 *   [0..hopLimit-1] = external hops (farthest to nearest)
 *   [hopLimit]      = ego
 *   [hopLimit+1..2*hopLimit] = internal hops (nearest to farthest)
 */
export function constructAuthorNetwork(
  egoId: string,
  relations: RelationRow[],
  allEntities: EntityRow[],
  hopLimit: number = DEFAULT_HOP_LIMIT
): {
  topology: TopologyEntry[];
  categoryMap: Record<string, LineCategoryValue>;
  groups: Record<string, string[][]>;
  network: RelationRow[];
} {
  // Ensure year strings
  relations = relations.map(r => ({ ...r, year: String(r.year) }));
  allEntities = allEntities.map(e => ({ ...e, year: String(e.year) }));

  // Ego affiliations by year
  const egoEntries = allEntities.filter(e => e.id === egoId);
  const egoStatus: Record<string, string> = {};
  for (const entry of egoEntries) {
    const remapped = remapJHAffiliation(entry.affiliation);
    if (!egoStatus[entry.year]) {
      egoStatus[entry.year] = remapped;
    }
  }
  const years = Object.keys(egoStatus);

  // Filter relations to years where ego exists
  relations = relations.filter(r => years.includes(r.year));

  // N-hop ego network with BFS distances
  const { relations: egoRelations, hopDistances } = constructEgoNetworks(relations, egoId, hopLimit);
  let network = egoRelations;

  // For 1-2 hop networks, keep only papers involving ego (original behavior).
  // For higher hops, the BFS already scopes relations correctly—hop-3+ papers
  // connect non-ego entities and must be preserved.
  if (hopLimit <= 2) {
    const byPaper: Record<string, RelationRow[]> = {};
    network.forEach(row => {
      if (!byPaper[row.id]) byPaper[row.id] = [];
      byPaper[row.id].push(row);
    });

    const validRows: RelationRow[] = [];
    for (const group of Object.values(byPaper)) {
      const nodes = new Set<string>();
      group.forEach(row => {
        nodes.add(row.sourceId);
        nodes.add(row.targetId);
      });
      if (nodes.has(egoId)) {
        validRows.push(...group);
      }
    }
    network = validRows;
  }

  // Helper: affiliations for entity in a year
  const getAffiliations = (entityId: string, year: string): string[] => {
    const entries = allEntities.filter(e => e.id === entityId && e.year === year);
    return [...new Set(entries.map(e => remapJHAffiliation(e.affiliation)))];
  };

  const groupSize = 2 * hopLimit + 1;
  const egoIdx = hopLimit; // ego is always at the center index

  const colorAssign: Record<string, Record<string, LineCategoryValue>> = {};
  const groupAssign: Record<string, Set<string>[]> = {};

  // Collect all entity IDs from the network
  const networkEntityIds = new Set<string>();
  network.forEach(row => {
    networkEntityIds.add(row.sourceId);
    networkEntityIds.add(row.targetId);
  });

  // Assign entities to groups using BFS hop distances
  for (const year of years) {
    if (!groupAssign[year]) {
      const groups: Set<string>[] = Array.from({ length: groupSize }, () => new Set());
      groups[egoIdx].add(egoId);
      groupAssign[year] = groups;
    }
    if (!colorAssign[year]) {
      colorAssign[year] = {};
    }

    const distMap = hopDistances[year];
    if (!distMap) continue;

    const egoAffiliations = getAffiliations(egoId, year);

    for (const eid of networkEntityIds) {
      if (eid === egoId) continue;
      const hopDist = distMap.get(eid);
      if (hopDist === undefined || hopDist === 0 || hopDist > hopLimit) continue;

      const affiliations = getAffiliations(eid, year);
      const isInternal = affiliations.some(a => egoAffiliations.includes(a));
      const category: LineCategoryValue = isInternal ? INTERNAL : EXTERNAL;

      // Internal → right of ego (egoIdx + hopDist), External → left of ego (egoIdx - hopDist)
      const groupIdx = isInternal ? egoIdx + hopDist : egoIdx - hopDist;
      groupAssign[year][groupIdx].add(eid);

      if (!colorAssign[year][eid]) {
        colorAssign[year][eid] = category;
      }
    }
  }

  // Handle overlaps: if entity appears in multiple groups, keep closest to ego
  const finalGroups: Record<string, string[][]> = {};

  for (const [year, groups] of Object.entries(groupAssign)) {
    // Resolve overlaps: prefer closer groups (smaller distance from ego)
    const seen = new Set<string>();
    const orderedIndices = [egoIdx];
    for (let d = 1; d <= hopLimit; d++) {
      orderedIndices.push(egoIdx + d, egoIdx - d);
    }
    for (const idx of orderedIndices) {
      for (const eid of groups[idx]) {
        if (seen.has(eid) && eid !== egoId) {
          groups[idx].delete(eid);
        } else {
          seen.add(eid);
        }
      }
    }

    // Sort each group
    const newGroups: string[][] = [];
    for (let idx = 0; idx < groups.length; idx++) {
      const group = groups[idx];
      if (group.size <= 1) {
        newGroups.push([...group]);
        continue;
      }

      const groupArray = [...group];
      const toBeReverse = idx >= egoIdx;

      groupArray.sort((a, b) => {
        const aCount = new Set(network.filter(r => r.sourceId === a || r.targetId === a).map(r => r.id)).size;
        const bCount = new Set(network.filter(r => r.sourceId === b || r.targetId === b).map(r => r.id)).size;

        if (aCount !== bCount) {
          return toBeReverse ? bCount - aCount : aCount - bCount;
        }
        return toBeReverse ? b.localeCompare(a) : a.localeCompare(b);
      });

      newGroups.push(groupArray);
    }

    finalGroups[year] = newGroups;
  }

  // Build category map (entity ID -> category)
  const categoryMap: Record<string, LineCategoryValue> = {};
  for (const eid of networkEntityIds) {
    for (const year of years) {
      const category = colorAssign[year]?.[eid];
      if (category) {
        categoryMap[eid] = category;
        break;
      }
    }
  }

  // Convert to topology format
  const topology: TopologyEntry[] = network.map(row => ({
    sourceId: row.sourceId,
    targetId: row.targetId,
    time: row.year,
    weight: 1
  }));

  return { topology, categoryMap, groups: finalGroups, network };
}
