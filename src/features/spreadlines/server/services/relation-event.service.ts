import 'server-only';

import path from 'path';
import { ORPCError } from '@orpc/server';
import type { RelationEvent } from '@/models/relation-event.model';
import { MAX_RELATION_EVENTS } from '@/features/relationship-evidence/const';
import { loadCSV, type RelationRow } from './csv.utils';

const DATASET_DIR = 'data/spreadline/vis-author2-monthly';

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
