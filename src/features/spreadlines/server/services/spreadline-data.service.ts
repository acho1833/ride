import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { ORPCError } from '@orpc/server';

// ── Internal CSV row types ──────────────────────────────────────────

interface RelationRow {
  year: string;
  source: string;
  target: string;
  id: string;
  count?: number;
  citationcount?: number;
}

interface EntityRow {
  year: string;
  name: string;
  affiliation: string;
}

interface CitationRow {
  paperID: string;
  year: number;
  name: string;
  citationcount: number;
}

// ── Public response types ───────────────────────────────────────────

export interface TopologyEntry {
  source: string;
  target: string;
  time: string;
  weight: number;
}

export interface LineColorEntry {
  entity: string;
  color: string;
}

export interface NodeContextEntry {
  entity: string;
  time: string;
  context: number;
}

export interface SpreadlineRawDataResponse {
  ego: string;
  dataset: string;
  topology: TopologyEntry[];
  lineColor: LineColorEntry[];
  groups: Record<string, string[][]>;
  nodeContext: NodeContextEntry[];
  config: {
    timeDelta: string;
    timeFormat: string;
    squeezeSameCategory: boolean;
    minimize: string;
  };
}

// ── Constants ───────────────────────────────────────────────────────

const INTERNAL_COLOR = '#FA9902';
const EXTERNAL_COLOR = '#166b6b';
const HOP_LIMIT = 2;
const DEFAULT_EGO = 'Jeffrey Heer';
const DATA_DIR = 'data/spreadline/vis-author';

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
function constructEgoNetworks(data: RelationRow[], ego: string): RelationRow[] {
  const indices = new Set<number>();

  // Group by time
  const byTime: Record<string, { row: RelationRow; idx: number }[]> = {};
  data.forEach((row, idx) => {
    const time = row.year;
    if (!byTime[time]) byTime[time] = [];
    byTime[time].push({ row, idx });
  });

  for (const entries of Object.values(byTime)) {
    let waitlist = new Set<string>([ego]);
    let hop = 1;

    while (waitlist.size > 0 && hop <= HOP_LIMIT) {
      const nextWaitlist: string[] = [];

      for (const each of waitlist) {
        const sources = entries.filter(e => e.row.target === each);
        const targets = entries.filter(e => e.row.source === each);

        const candidates: string[] = [...sources.map(e => e.row.source), ...targets.map(e => e.row.target)];

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
 * Build author network with line colors and group assignments.
 */
function constructAuthorNetwork(
  ego: string,
  relations: RelationRow[],
  allEntities: EntityRow[]
): { topology: TopologyEntry[]; lineColor: LineColorEntry[]; groups: Record<string, string[][]>; network: RelationRow[] } {
  // Ensure year strings
  relations = relations.map(r => ({ ...r, year: String(r.year) }));
  allEntities = allEntities.map(e => ({ ...e, year: String(e.year) }));

  // Ego affiliations by year
  const egoEntries = allEntities.filter(e => e.name === ego);
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
  let network = constructEgoNetworks(relations, ego);

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
      nodes.add(row.source);
      nodes.add(row.target);
    });
    if (nodes.has(ego)) {
      validRows.push(...group);
    }
  }
  network = validRows;

  // Helper: affiliations for author in a year
  const getAffiliations = (author: string, year: string): string[] => {
    const entries = allEntities.filter(e => e.name === author && e.year === year);
    return [...new Set(entries.map(e => remapJHAffiliation(e.affiliation)))];
  };

  const colorAssign: Record<string, Record<string, string>> = {};
  const groupAssign: Record<string, Set<string>[]> = {};

  for (const row of network) {
    const firstAuthor = row.source;
    const author = row.target;
    const year = row.year;
    const egoAffiliations = getAffiliations(ego, year);

    if (!groupAssign[year]) {
      groupAssign[year] = [new Set(), new Set(), new Set([ego]), new Set(), new Set()];
    }
    if (!colorAssign[year]) {
      colorAssign[year] = {};
    }

    if (author === ego) {
      const affiliations = getAffiliations(firstAuthor, year);
      const intersection = affiliations.filter(a => egoAffiliations.includes(a));
      const color = intersection.length > 0 ? INTERNAL_COLOR : EXTERNAL_COLOR;

      if (intersection.length > 0) {
        groupAssign[year][3].add(firstAuthor);
      } else {
        groupAssign[year][1].add(firstAuthor);
      }

      if (!colorAssign[year][firstAuthor]) {
        colorAssign[year][firstAuthor] = color;
      }
    } else {
      const affiliations = getAffiliations(author, year);
      const intersection = affiliations.filter(a => egoAffiliations.includes(a));
      const color = intersection.length > 0 ? INTERNAL_COLOR : EXTERNAL_COLOR;

      if (color === INTERNAL_COLOR) {
        groupAssign[year][4].add(author);
      } else {
        groupAssign[year][0].add(author);
      }

      if (!colorAssign[year][author]) {
        colorAssign[year][author] = color;
      }
    }

    // Count collaborations
    const collab = network.filter(
      r => r.source === (author === ego ? firstAuthor : author) || r.target === (author === ego ? firstAuthor : author)
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
        const aCount = new Set(network.filter(r => r.source === a || r.target === a).map(r => r.id)).size;
        const bCount = new Set(network.filter(r => r.source === b || r.target === b).map(r => r.id)).size;

        if (aCount !== bCount) {
          return toBeReverse ? bCount - aCount : aCount - bCount;
        }
        return toBeReverse ? b.localeCompare(a) : a.localeCompare(b);
      });

      newGroups.push(groupArray);
    }

    finalGroups[year] = newGroups;
  }

  // Build line color array
  const entities = new Set<string>();
  network.forEach(row => {
    entities.add(row.source);
    entities.add(row.target);
  });

  const lineColorEntries: LineColorEntry[] = [];
  for (const entity of entities) {
    for (const year of years) {
      const color = colorAssign[year]?.[entity];
      if (color) {
        lineColorEntries.push({ entity, color });
        break;
      }
    }
  }

  // Convert to topology format
  const topology: TopologyEntry[] = network.map(row => ({
    source: row.source,
    target: row.target,
    time: row.year,
    weight: row.count || 1
  }));

  return { topology, lineColor: lineColorEntries, groups: finalGroups, network };
}

// ── Public API ──────────────────────────────────────────────────────

export async function getSpreadlineRawData(ego?: string): Promise<SpreadlineRawDataResponse> {
  const resolvedEgo = ego || DEFAULT_EGO;
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

  const { topology, lineColor, groups, network } = constructAuthorNetwork(resolvedEgo, relations, allEntities);

  // Build node context from citations
  const papers = [...new Set(network.map(r => r.id))];
  const frames: NodeContextEntry[] = [];

  for (const paper of papers) {
    const group = citations.filter(c => c.paperID === paper);
    for (const row of group) {
      frames.push({
        entity: row.name,
        time: String(row.year),
        context: row.citationcount
      });
    }
  }

  // Aggregate by entity+time
  const aggregated: Record<string, NodeContextEntry> = {};
  for (const frame of frames) {
    const key = `${frame.entity},${frame.time}`;
    if (!aggregated[key]) {
      aggregated[key] = { ...frame };
    } else {
      aggregated[key].context += frame.context;
    }
  }
  const nodeContext = Object.values(aggregated);

  return {
    ego: resolvedEgo,
    dataset: 'vis-author',
    topology,
    lineColor,
    groups,
    nodeContext,
    config: {
      timeDelta: 'year',
      timeFormat: '%Y',
      squeezeSameCategory: true,
      minimize: 'wiggles'
    }
  };
}
