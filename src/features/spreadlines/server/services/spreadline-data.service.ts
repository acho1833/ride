import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { ORPCError } from '@orpc/server';

// ── Internal CSV row types ──────────────────────────────────────────

interface RelationRow {
  year: string;
  sourceId: string;
  targetId: string;
  id: string;
  type: string;
  citationcount?: number;
}

interface EntityRow {
  id: string;
  year: string;
  name: string;
  citationcount: number;
  affiliation: string;
}

interface CitationRow {
  paperID: string;
  year: number;
  entityId: string;
  citationcount: number;
}

// ── Public response types ───────────────────────────────────────────

export type LineCategoryValue = 'internal' | 'external';

export interface TopologyEntry {
  sourceId: string;
  targetId: string;
  time: string;
  weight: number;
}

export interface EntityInfo {
  name: string;
  category: LineCategoryValue;
  citations: Record<string, number>;
}

export interface SpreadlineRawDataResponse {
  egoId: string;
  egoName: string;
  dataset: string;
  entities: Record<string, EntityInfo>;
  topology: TopologyEntry[];
  groups: Record<string, string[][]>;
  totalPages: number;
  timeBlocks: string[];
}

// ── Constants ───────────────────────────────────────────────────────

const INTERNAL: LineCategoryValue = 'internal';
const EXTERNAL: LineCategoryValue = 'external';
const HOP_LIMIT = 2;
const DATASET_NAME = 'vis-author2';
const DATASET_DIRS: Record<string, string> = {
  yearly: 'data/spreadline/vis-author2',
  monthly: 'data/spreadline/vis-author2-monthly'
};

// ── Helpers ─────────────────────────────────────────────────────────

async function loadCSV<T>(filePath: string): Promise<T[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse<T>(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  return result.data;
}

function remapJHAffiliation(affiliation: string | null | undefined): string {
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
 * Construct ego-centric network via 2-hop BFS per time slice.
 */
function constructEgoNetworks(data: RelationRow[], egoId: string): RelationRow[] {
  const indices = new Set<number>();

  // Group by time
  const byTime: Record<string, { row: RelationRow; idx: number }[]> = {};
  data.forEach((row, idx) => {
    const time = row.year;
    if (!byTime[time]) byTime[time] = [];
    byTime[time].push({ row, idx });
  });

  for (const entries of Object.values(byTime)) {
    let waitlist = new Set<string>([egoId]);
    let hop = 1;

    while (waitlist.size > 0 && hop <= HOP_LIMIT) {
      const nextWaitlist: string[] = [];

      for (const each of waitlist) {
        const sources = entries.filter(e => e.row.targetId === each);
        const targets = entries.filter(e => e.row.sourceId === each);

        const candidates: string[] = [...sources.map(e => e.row.sourceId), ...targets.map(e => e.row.targetId)];

        sources.forEach(e => indices.add(e.idx));
        targets.forEach(e => indices.add(e.idx));

        nextWaitlist.push(...candidates);
      }

      const nextSet = new Set(nextWaitlist);
      for (const w of waitlist) nextSet.delete(w);
      waitlist = nextSet;
      hop++;
    }
  }

  return data.filter((_, idx) => indices.has(idx));
}

/**
 * Build author network with category assignments and group assignments.
 */
function constructAuthorNetwork(
  egoId: string,
  relations: RelationRow[],
  allEntities: EntityRow[]
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

  // 2-hop ego network
  let network = constructEgoNetworks(relations, egoId);

  // Keep only papers involving ego
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

  // Helper: affiliations for entity in a year
  const getAffiliations = (entityId: string, year: string): string[] => {
    const entries = allEntities.filter(e => e.id === entityId && e.year === year);
    return [...new Set(entries.map(e => remapJHAffiliation(e.affiliation)))];
  };

  const colorAssign: Record<string, Record<string, LineCategoryValue>> = {};
  const groupAssign: Record<string, Set<string>[]> = {};

  for (const row of network) {
    const firstAuthor = row.sourceId;
    const author = row.targetId;
    const year = row.year;
    const egoAffiliations = getAffiliations(egoId, year);

    if (!groupAssign[year]) {
      groupAssign[year] = [new Set(), new Set(), new Set([egoId]), new Set(), new Set()];
    }
    if (!colorAssign[year]) {
      colorAssign[year] = {};
    }

    if (author === egoId) {
      const affiliations = getAffiliations(firstAuthor, year);
      const intersection = affiliations.filter(a => egoAffiliations.includes(a));
      const category = intersection.length > 0 ? INTERNAL : EXTERNAL;

      if (intersection.length > 0) {
        groupAssign[year][3].add(firstAuthor);
      } else {
        groupAssign[year][1].add(firstAuthor);
      }

      if (!colorAssign[year][firstAuthor]) {
        colorAssign[year][firstAuthor] = category;
      }
    } else {
      const affiliations = getAffiliations(author, year);
      const intersection = affiliations.filter(a => egoAffiliations.includes(a));
      const category = intersection.length > 0 ? INTERNAL : EXTERNAL;

      if (category === INTERNAL) {
        groupAssign[year][4].add(author);
      } else {
        groupAssign[year][0].add(author);
      }

      if (!colorAssign[year][author]) {
        colorAssign[year][author] = category;
      }
    }
  }

  // Handle overlaps and sort groups
  const finalGroups: Record<string, string[][]> = {};

  for (const [year, groups] of Object.entries(groupAssign)) {
    const pairIndices: [number, number][] = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (i !== 2 && j !== 2) {
          pairIndices.push([i, j]);
        }
      }
    }

    for (const [firstIdx, secondIdx] of pairIndices) {
      const pair0 = groups[firstIdx];
      const pair1 = groups[secondIdx];
      const intersection = new Set([...pair0].filter(x => pair1.has(x)));

      if (intersection.size > 0) {
        if ([0, 4].includes(firstIdx)) {
          intersection.forEach(x => groups[firstIdx].delete(x));
        } else if ([0, 4].includes(secondIdx)) {
          intersection.forEach(x => groups[secondIdx].delete(x));
        }
      }
    }

    const newGroups: string[][] = [];
    for (let idx = 0; idx < groups.length; idx++) {
      const group = groups[idx];
      if (group.size <= 1) {
        newGroups.push([...group]);
        continue;
      }

      const groupArray = [...group];
      const toBeReverse = idx >= 2;

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
  const entityIds = new Set<string>();
  network.forEach(row => {
    entityIds.add(row.sourceId);
    entityIds.add(row.targetId);
  });

  for (const eid of entityIds) {
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

// ── Public API ──────────────────────────────────────────────────────

export async function getSpreadlineRawData(params: {
  egoId: string;
  relationTypes: string[];
  yearRange: [number, number];
  granularity?: 'yearly' | 'monthly';
  splitByAffiliation?: boolean;
  pageIndex?: number;
  pageSize?: number;
}): Promise<SpreadlineRawDataResponse> {
  const { egoId, relationTypes, yearRange, granularity = 'yearly', splitByAffiliation = true, pageIndex = 0, pageSize = 20 } = params;
  const dataDir = DATASET_DIRS[granularity] ?? DATASET_DIRS.yearly;
  const basePath = path.join(process.cwd(), dataDir);

  let relations: RelationRow[];
  let allEntities: EntityRow[];
  let citations: CitationRow[];

  try {
    [relations, allEntities, citations] = await Promise.all([
      loadCSV<RelationRow>(path.join(basePath, 'relations.csv')),
      loadCSV<EntityRow>(path.join(basePath, 'entities.csv')),
      loadCSV<CitationRow>(path.join(basePath, 'citations.csv'))
    ]);
  } catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: `Failed to read CSV data files: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Filter relations by type and year range
  relations = relations.filter(r => {
    const yearStr = String(r.year);
    const year = Number(yearStr.substring(0, 4));
    return relationTypes.includes(r.type) && year >= yearRange[0] && year <= yearRange[1];
  });

  // Build ID -> name lookup
  const idToName: Record<string, string> = {};
  for (const e of allEntities) {
    if (!idToName[e.id]) {
      idToName[e.id] = e.name;
    }
  }

  if (!idToName[egoId]) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Ego entity "${egoId}" not found`
    });
  }

  const { topology, categoryMap, groups, network } = constructAuthorNetwork(egoId, relations, allEntities);

  // When splitByAffiliation is disabled, merge external entities into internal groups
  if (!splitByAffiliation) {
    // Set all categories to internal
    for (const eid of Object.keys(categoryMap)) {
      categoryMap[eid] = INTERNAL;
    }
    // Move external groups into internal: groups[0] -> groups[4], groups[1] -> groups[3]
    for (const g of Object.values(groups)) {
      if (g.length === 5) {
        g[3].push(...g[1]); // ext-1hop -> int-1hop
        g[4].push(...g[0]); // ext-2hop -> int-2hop
        g[1] = [];
        g[0] = [];
      }
    }
  }

  // Build citations per entity
  const papers = [...new Set(network.map(r => r.id))];
  const citationsByEntity: Record<string, Record<string, number>> = {};
  for (const paper of papers) {
    const group = citations.filter(c => c.paperID === paper);
    for (const row of group) {
      const eid = row.entityId;
      const time = String(row.year);
      if (!citationsByEntity[eid]) citationsByEntity[eid] = {};
      citationsByEntity[eid][time] = (citationsByEntity[eid][time] || 0) + row.citationcount;
    }
  }

  // Build entities map (ego excluded — ego has no category)
  const entityIds = new Set<string>();
  network.forEach(row => {
    entityIds.add(row.sourceId);
    entityIds.add(row.targetId);
  });

  const entities: Record<string, EntityInfo> = {};
  for (const eid of entityIds) {
    if (eid === egoId) continue;
    entities[eid] = {
      name: idToName[eid] || eid,
      category: categoryMap[eid] || EXTERNAL,
      citations: citationsByEntity[eid] || {}
    };
  }

  // Extract unique time blocks sorted descending (newest first)
  const allTimeBlocks = [...new Set(topology.map(t => t.time))].sort((a, b) => b.localeCompare(a));
  const totalPages = Math.max(1, Math.ceil(allTimeBlocks.length / pageSize));
  const clampedPage = Math.max(0, Math.min(pageIndex, totalPages - 1));
  const start = clampedPage * pageSize;
  const end = Math.min(start + pageSize, allTimeBlocks.length);
  const pageTimeBlocks = allTimeBlocks.slice(start, end);

  // Pad to pageSize so every page lays out the same number of columns.
  // Generate earlier time labels beyond the last real block.
  if (pageTimeBlocks.length < pageSize && pageTimeBlocks.length > 0) {
    const lastLabel = pageTimeBlocks[pageTimeBlocks.length - 1];
    const existing = new Set(pageTimeBlocks);
    if (granularity === 'monthly') {
      // Format: "YYYY-MM"
      let [y, m] = lastLabel.split('-').map(Number);
      while (pageTimeBlocks.length < pageSize) {
        m -= 1;
        if (m < 1) {
          m = 12;
          y -= 1;
        }
        const label = `${y}-${String(m).padStart(2, '0')}`;
        if (!existing.has(label)) {
          pageTimeBlocks.push(label);
          existing.add(label);
        }
      }
    } else {
      // Format: "YYYY"
      let y = Number(lastLabel);
      while (pageTimeBlocks.length < pageSize) {
        y -= 1;
        const label = String(y);
        if (!existing.has(label)) {
          pageTimeBlocks.push(label);
          existing.add(label);
        }
      }
    }
  }

  const pageTimeSet = new Set(pageTimeBlocks);

  // Filter topology, entities, and groups to the current page's time blocks
  const pagedTopology = topology.filter(t => pageTimeSet.has(t.time));

  const activeEntityIds = new Set<string>();
  for (const t of pagedTopology) {
    activeEntityIds.add(t.sourceId);
    activeEntityIds.add(t.targetId);
  }

  const pagedEntities: Record<string, EntityInfo> = {};
  for (const [eid, info] of Object.entries(entities)) {
    if (!activeEntityIds.has(eid)) continue;
    const filteredCitations: Record<string, number> = {};
    for (const [time, count] of Object.entries(info.citations)) {
      if (pageTimeSet.has(time)) filteredCitations[time] = count;
    }
    pagedEntities[eid] = { ...info, citations: filteredCitations };
  }

  const pagedGroups: Record<string, string[][]> = {};
  for (const [time, g] of Object.entries(groups)) {
    if (pageTimeSet.has(time)) pagedGroups[time] = g;
  }

  return {
    egoId,
    egoName: idToName[egoId],
    dataset: granularity === 'monthly' ? 'vis-author2-monthly' : DATASET_NAME,
    entities: pagedEntities,
    topology: pagedTopology,
    groups: pagedGroups,
    totalPages,
    timeBlocks: pageTimeBlocks
  };
}
