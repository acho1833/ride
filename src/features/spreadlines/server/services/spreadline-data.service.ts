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
  count?: number;
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
  dataset: string;
  entities: Record<string, EntityInfo>;
  topology: TopologyEntry[];
  groups: Record<string, string[][]>;
  config: {
    timeDelta: string;
    timeFormat: string;
    squeezeSameCategory: boolean;
    minimize: string;
  };
}

// ── Constants ───────────────────────────────────────────────────────

const INTERNAL: LineCategoryValue = 'internal';
const EXTERNAL: LineCategoryValue = 'external';
const HOP_LIMIT = 2;
const DEFAULT_EGO = 'Jeffrey Heer';
const DATASET_NAME = 'vis-author2';
const DATA_DIR = `data/spreadline/${DATASET_NAME}`;

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

    // Count collaborations
    const collab = network.filter(
      r => r.sourceId === (author === egoId ? firstAuthor : author) || r.targetId === (author === egoId ? firstAuthor : author)
    );
    const uniquePapers = new Set(collab.map(r => r.id));
    row.count = uniquePapers.size;
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
    weight: row.count || 1
  }));

  return { topology, categoryMap, groups: finalGroups, network };
}

// ── Public API ──────────────────────────────────────────────────────

export async function getSpreadlineRawData(ego?: string): Promise<SpreadlineRawDataResponse> {
  const resolvedEgoName = ego || DEFAULT_EGO;
  const basePath = path.join(process.cwd(), DATA_DIR);

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

  // Build name -> ID and ID -> name lookups
  const nameToId: Record<string, string> = {};
  const idToName: Record<string, string> = {};
  for (const e of allEntities) {
    if (!nameToId[e.name]) {
      nameToId[e.name] = e.id;
      idToName[e.id] = e.name;
    }
  }

  const egoId = nameToId[resolvedEgoName];
  if (!egoId) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Ego entity "${resolvedEgoName}" not found`
    });
  }

  const { topology, categoryMap, groups, network } = constructAuthorNetwork(egoId, relations, allEntities);

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

  return {
    egoId,
    dataset: DATASET_NAME,
    entities,
    topology,
    groups,
    config: {
      timeDelta: 'year',
      timeFormat: '%Y',
      squeezeSameCategory: true,
      minimize: 'wiggles'
    }
  };
}
