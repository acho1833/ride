import 'server-only';

import path from 'path';
import { ORPCError } from '@orpc/server';
import { loadCSV, type RelationRow } from './csv.utils';
import { constructAuthorNetwork, INTERNAL, EXTERNAL } from './author-network.utils';

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

const DATASET_NAME = 'vis-author2';
const DATASET_DIRS: Record<string, string> = {
  yearly: 'data/spreadline/vis-author2',
  monthly: 'data/spreadline/vis-author2-monthly'
};

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
