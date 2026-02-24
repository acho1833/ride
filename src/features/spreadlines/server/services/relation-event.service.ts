import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { ORPCError } from '@orpc/server';
import type { RelationEvent } from '@/models/relation-event.model';
import { MAX_RELATION_EVENTS } from '@/features/relationship-evidence/const';

interface RelationRow {
  year: string;
  sourceId: string;
  targetId: string;
  id: string;
  type: string;
  citationcount?: number;
}

const DATASET_DIR = 'data/spreadline/vis-author2-monthly';

async function loadCSV<T>(filePath: string): Promise<T[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse<T>(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  return result.data;
}

export async function getRelationEvents(sourceId: string, targetId: string): Promise<RelationEvent[]> {
  const basePath = path.join(process.cwd(), DATASET_DIR);
  let relations: RelationRow[];
  try {
    relations = await loadCSV<RelationRow>(path.join(basePath, 'relations.csv'));
  } catch {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Failed to load relations data'
    });
  }

  const filtered = relations.filter(
    r => (r.sourceId === sourceId && r.targetId === targetId) || (r.sourceId === targetId && r.targetId === sourceId)
  );

  const events: RelationEvent[] = filtered.map(r => ({
    id: r.id,
    year: String(r.year),
    sourceId: r.sourceId,
    targetId: r.targetId,
    type: r.type,
    citationCount: r.citationcount ?? 0
  }));

  events.sort((a, b) => b.year.localeCompare(a.year));

  return events.slice(0, MAX_RELATION_EVENTS);
}
