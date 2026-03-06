import 'server-only';

import type { RelationRow } from './csv.utils';
import type { TopologyEntry, LineCategoryValue } from './spreadline-data.service';
import { SPREADLINE_DEFAULT_HOP_LIMIT } from '@/features/spreadlines/const';

export interface EntityRow {
  id: string;
  year: string;
  name: string;
  relationshipcount: number;
  affiliation: string;
}

export const INTERNAL: LineCategoryValue = 'internal';
export const EXTERNAL: LineCategoryValue = 'external';

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
  hopLimit: number = SPREADLINE_DEFAULT_HOP_LIMIT
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
    // Pre-build adjacency maps for O(1) neighbor lookups
    const bySource = new Map<string, { row: RelationRow; idx: number }[]>();
    const byTarget = new Map<string, { row: RelationRow; idx: number }[]>();
    for (const entry of entries) {
      const sId = entry.row.sourceId;
      const tId = entry.row.targetId;
      if (!bySource.has(sId)) bySource.set(sId, []);
      bySource.get(sId)!.push(entry);
      if (!byTarget.has(tId)) byTarget.set(tId, []);
      byTarget.get(tId)!.push(entry);
    }

    const distMap = new Map<string, number>();
    distMap.set(egoId, 0);
    let waitlist = new Set<string>([egoId]);
    const visited = new Set<string>([egoId]);
    let hop = 1;

    while (waitlist.size > 0 && hop <= hopLimit) {
      const nextWaitlist: string[] = [];

      for (const each of waitlist) {
        const sources = byTarget.get(each) || [];
        const targets = bySource.get(each) || [];

        for (const e of sources) {
          indices.add(e.idx);
          const c = e.row.sourceId;
          if (!visited.has(c)) {
            distMap.set(c, hop);
            visited.add(c);
            nextWaitlist.push(c);
          }
        }
        for (const e of targets) {
          indices.add(e.idx);
          const c = e.row.targetId;
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
 * Build entity network with category assignments and dynamic group assignments.
 *
 * Groups array has `2*hopLimit + 1` slots:
 *   [0..hopLimit-1] = external hops (farthest to nearest)
 *   [hopLimit]      = ego
 *   [hopLimit+1..2*hopLimit] = internal hops (nearest to farthest)
 */
export function constructEntityNetwork(
  egoId: string,
  relations: RelationRow[],
  allEntities: EntityRow[],
  hopLimit: number = SPREADLINE_DEFAULT_HOP_LIMIT
): {
  topology: TopologyEntry[];
  categoryMap: Record<string, Record<string, LineCategoryValue>>;
  groups: Record<string, string[][]>;
  network: RelationRow[];
} {
  // Coerce year to string in-place (avoids cloning entire arrays)
  for (const r of relations) r.year = String(r.year);
  for (const e of allEntities) e.year = String(e.year);

  // Pre-build affiliation lookup: "entityId|year" -> remapped affiliations
  const affiliationLookup = new Map<string, string[]>();
  for (const e of allEntities) {
    const key = `${e.id}|${e.year}`;
    if (!affiliationLookup.has(key)) affiliationLookup.set(key, []);
    const remapped = remapJHAffiliation(e.affiliation);
    const list = affiliationLookup.get(key)!;
    if (!list.includes(remapped)) list.push(remapped);
  }

  // Ego affiliations by year
  const egoStatus: Record<string, string> = {};
  for (const e of allEntities) {
    if (e.id === egoId && !egoStatus[e.year]) {
      egoStatus[e.year] = remapJHAffiliation(e.affiliation);
    }
  }
  const yearsSet = new Set(Object.keys(egoStatus));

  // Filter relations to years where ego exists
  relations = relations.filter(r => yearsSet.has(r.year));

  // N-hop ego network with BFS distances
  const { relations: egoRelations, hopDistances } = constructEgoNetworks(relations, egoId, hopLimit);
  const network = egoRelations;

  // Helper: affiliations for entity in a year (O(1) lookup)
  const getAffiliations = (entityId: string, year: string): string[] => {
    return affiliationLookup.get(`${entityId}|${year}`) || [];
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
  for (const year of yearsSet) {
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

    // Pre-compute distinct paper counts per entity
    const entityPapers = new Map<string, Set<string>>();
    for (const r of network) {
      if (!entityPapers.has(r.sourceId)) entityPapers.set(r.sourceId, new Set());
      if (!entityPapers.has(r.targetId)) entityPapers.set(r.targetId, new Set());
      entityPapers.get(r.sourceId)!.add(r.id);
      entityPapers.get(r.targetId)!.add(r.id);
    }
    const paperCounts = new Map<string, number>();
    for (const [eid, papers] of entityPapers) {
      paperCounts.set(eid, papers.size);
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
        const aCount = paperCounts.get(a) || 0;
        const bCount = paperCounts.get(b) || 0;

        if (aCount !== bCount) {
          return toBeReverse ? bCount - aCount : aCount - bCount;
        }
        return toBeReverse ? b.localeCompare(a) : a.localeCompare(b);
      });

      newGroups.push(groupArray);
    }

    finalGroups[year] = newGroups;
  }

  // Build category map (entity ID -> time -> category)
  const categoryMap: Record<string, Record<string, LineCategoryValue>> = {};
  for (const [year, assignments] of Object.entries(colorAssign)) {
    for (const [eid, category] of Object.entries(assignments)) {
      if (!categoryMap[eid]) categoryMap[eid] = {};
      categoryMap[eid][year] = category;
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
