import 'server-only';

import { getDb } from '@/lib/mock-db';
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';
import type { PatternSearchParams, PatternSearchResponse, PatternMatch, PatternNode, PatternEdge } from '../../types';

/** Convert glob pattern to SQL LIKE pattern */
function globToLike(pattern: string): string {
  return pattern.replace(/\*/g, '%').replace(/\?/g, '_');
}

/** Build SQL query for pattern matching */
function buildPatternQuery(
  nodes: PatternNode[],
  edges: PatternEdge[],
  options: { countOnly?: boolean; sortDirection?: 'asc' | 'desc'; limit?: number; offset?: number }
): { sql: string; params: unknown[] } {
  const sortedNodes = [...nodes].sort((a, b) => a.label.localeCompare(b.label));
  const nodeIndexMap = new Map(sortedNodes.map((n, i) => [n.id, i]));
  const params: unknown[] = [];

  // SELECT
  let select: string;
  if (options.countOnly) {
    select = 'SELECT COUNT(*) as count';
  } else {
    const cols: string[] = [];
    for (let i = 0; i < sortedNodes.length; i++) {
      cols.push(`e${i}.id as e${i}_id, e${i}.label_normalized as e${i}_label, e${i}.type as e${i}_type`);
    }
    for (let i = 0; i < edges.length; i++) {
      cols.push(`r${i}.relationship_id as r${i}_rid, r${i}.predicate as r${i}_pred, r${i}.source_entity_id as r${i}_src, r${i}.related_entity_id as r${i}_rel`);
    }
    select = `SELECT ${cols.join(', ')}`;
  }

  // FROM
  const from = `FROM entity e0`;

  // JOINs
  const joins: string[] = [];
  const joinedNodeIndexes = new Set<number>([0]);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const srcIdx = nodeIndexMap.get(edge.sourceNodeId)!;
    const tgtIdx = nodeIndexMap.get(edge.targetNodeId)!;

    const knownIdx = joinedNodeIndexes.has(srcIdx) ? srcIdx : tgtIdx;
    const newIdx = knownIdx === srcIdx ? tgtIdx : srcIdx;

    // Join relationship (bidirectional)
    let relJoin = `JOIN relationship r${i} ON (r${i}.source_entity_id = e${knownIdx}.id AND r${i}.related_entity_id = e${newIdx}.id) OR (r${i}.source_entity_id = e${newIdx}.id AND r${i}.related_entity_id = e${knownIdx}.id)`;

    if (edge.predicates.length > 0) {
      relJoin += ` AND r${i}.predicate IN (${edge.predicates.map(() => '?').join(', ')})`;
      params.push(...edge.predicates);
    }

    if (!joinedNodeIndexes.has(newIdx)) {
      joins.push(relJoin);
      joins.push(`JOIN entity e${newIdx} ON e${newIdx}.id = CASE WHEN r${i}.source_entity_id = e${knownIdx}.id THEN r${i}.related_entity_id ELSE r${i}.source_entity_id END`);
      joinedNodeIndexes.add(newIdx);
    } else {
      joins.push(relJoin);
    }
  }

  // Disconnected nodes
  for (let i = 1; i < sortedNodes.length; i++) {
    if (!joinedNodeIndexes.has(i)) {
      joins.push(`CROSS JOIN entity e${i}`);
      joinedNodeIndexes.add(i);
    }
  }

  // WHERE
  const conditions: string[] = [];
  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    if (node.type !== null) {
      conditions.push(`e${i}.type = ?`);
      params.push(node.type);
    }
    for (const filter of node.filters) {
      if (filter.attribute === 'labelNormalized' && filter.patterns.length > 0) {
        const nonEmpty = filter.patterns.filter(p => p.trim().length > 0);
        if (nonEmpty.length > 0) {
          const likeClauses = nonEmpty.map(() => `e${i}.label_normalized LIKE ? COLLATE NOCASE`);
          conditions.push(`(${likeClauses.join(' OR ')})`);
          params.push(...nonEmpty.map(globToLike));
        }
      }
    }
  }

  // No duplicate entities
  for (let i = 0; i < sortedNodes.length; i++) {
    for (let j = i + 1; j < sortedNodes.length; j++) {
      conditions.push(`e${i}.id != e${j}.id`);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = '';
  let limitOffset = '';
  if (!options.countOnly) {
    orderBy = `ORDER BY e0.label_normalized COLLATE NOCASE ${options.sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
    if (options.limit !== undefined) {
      limitOffset = `LIMIT ? OFFSET ?`;
      params.push(options.limit, options.offset ?? 0);
    }
  }

  const sql = [select, from, ...joins, where, orderBy, limitOffset].filter(Boolean).join('\n');
  return { sql, params };
}

/**
 * Search for pattern matches in the entity graph.
 * Returns paginated results with entities ordered alphabetically by node label.
 */
export async function searchPattern(params: PatternSearchParams): Promise<PatternSearchResponse> {
  const { pattern, pageSize, pageNumber, sortDirection = 'asc' } = params;

  if (pattern.nodes.length === 0) {
    return { matches: [], totalCount: 0, pageNumber, pageSize };
  }

  const db = getDb();
  const offset = (pageNumber - 1) * pageSize;

  const countQuery = buildPatternQuery(pattern.nodes, pattern.edges, { countOnly: true });
  const totalCount = (db.prepare(countQuery.sql).get(...countQuery.params) as { count: number }).count;

  const dataQuery = buildPatternQuery(pattern.nodes, pattern.edges, {
    sortDirection, limit: pageSize, offset
  });

  const rows = db.prepare(dataQuery.sql).all(...dataQuery.params) as Record<string, string>[];
  const sortedNodes = [...pattern.nodes].sort((a, b) => a.label.localeCompare(b.label));

  const matches: PatternMatch[] = rows.map(row => {
    const entities: Entity[] = sortedNodes.map((_, i) => ({
      id: row[`e${i}_id`],
      labelNormalized: row[`e${i}_label`],
      type: row[`e${i}_type`]
    }));

    const relationships: Relationship[] = pattern.edges.map((_, i) => ({
      relationshipId: row[`r${i}_rid`],
      predicate: row[`r${i}_pred`],
      sourceEntityId: row[`r${i}_src`],
      relatedEntityId: row[`r${i}_rel`]
    }));

    return { entities, relationships };
  });

  return { matches, totalCount, pageNumber, pageSize };
}

/**
 * Get available relationship predicates for the edge filter UI.
 */
export async function getPredicates(): Promise<string[]> {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT predicate FROM relationship ORDER BY predicate').all() as { predicate: string }[];
  return rows.map(r => r.predicate);
}
