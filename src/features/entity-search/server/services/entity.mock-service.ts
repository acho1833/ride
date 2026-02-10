import 'server-only';

import { getDb } from '@/lib/mock-db';
import type { EntityResponse, RelatedEntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/**
 * Simulates external API search endpoint.
 * - Filters by name: supports trailing wildcard (*) for prefix match, otherwise contains match
 * - Filters by types (empty array = no filter, returns all types)
 * - Sorts results by labelNormalized (case-insensitive) based on sortDirection
 * - Applies pagination
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchMockResponse> {
  const db = getDb();

  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  // Filter by name (supports trailing wildcard for prefix match)
  if (params.name && params.name.trim() !== '') {
    const name = params.name.trim();
    if (name.endsWith('*')) {
      const prefix = name.slice(0, -1);
      conditions.push('label_normalized LIKE ? COLLATE NOCASE');
      queryParams.push(`${prefix}%`);
    } else {
      conditions.push('label_normalized LIKE ? COLLATE NOCASE');
      queryParams.push(`%${name}%`);
    }
  }

  // Filter by types (empty array = show all)
  if (params.types && params.types.length > 0) {
    const placeholders = params.types.map(() => '?').join(', ');
    conditions.push(`type IN (${placeholders})`);
    queryParams.push(...params.types);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
  const offset = (params.pageNumber - 1) * params.pageSize;

  const entitiesQuery = `
    SELECT id, label_normalized as labelNormalized, type
    FROM entity
    ${whereClause}
    ORDER BY label_normalized COLLATE NOCASE ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `SELECT COUNT(*) as totalCount FROM entity ${whereClause}`;

  const entities = db.prepare(entitiesQuery).all(...queryParams, params.pageSize, offset) as EntityResponse[];
  const { totalCount } = db.prepare(countQuery).get(...queryParams) as { totalCount: number };

  return {
    entities: entities.map(e => ({ id: e.id, labelNormalized: e.labelNormalized, type: e.type })),
    totalCount,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize
  };
}

/**
 * Simulates external API endpoint to get available entity types.
 * Returns dynamic list of types from the external system.
 */
export async function getEntityTypes(): Promise<string[]> {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT type FROM entity ORDER BY type').all() as { type: string }[];
  return rows.map(r => r.type);
}

/**
 * Get entity by ID with all related entities.
 * Returns the entity with a flat relatedEntities array (simulating external API format).
 * @param id - Entity ID to fetch
 */
export async function getEntityById(id: string): Promise<EntityResponse | null> {
  const db = getDb();

  const entity = db.prepare('SELECT id, label_normalized as labelNormalized, type FROM entity WHERE id = ?').get(id) as
    | EntityResponse
    | undefined;

  if (!entity) return null;

  // Query related entities with a JOIN
  const rows = db
    .prepare(
      `
    SELECT r.predicate as relType,
           e.id as eId, e.label_normalized as eLabel, e.type as eType
    FROM relationship r
    JOIN entity e ON e.id = CASE WHEN r.source_entity_id = ? THEN r.related_entity_id ELSE r.source_entity_id END
    WHERE r.source_entity_id = ? OR r.related_entity_id = ?
  `
    )
    .all(id, id, id) as { relType: string; eId: string; eLabel: string; eType: string }[];

  const relatedEntities: RelatedEntityResponse[] = rows.map(row => ({
    type: row.relType,
    entity: {
      id: row.eId,
      labelNormalized: row.eLabel,
      type: row.eType
    }
  }));

  return {
    id: entity.id,
    labelNormalized: entity.labelNormalized,
    type: entity.type,
    relatedEntities: relatedEntities.length > 0 ? relatedEntities : undefined
  };
}
