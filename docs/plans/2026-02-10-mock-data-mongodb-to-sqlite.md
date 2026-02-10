# Mock Data: MongoDB to SQLite Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace MongoDB with `better-sqlite3` for mock data to eliminate per-query overhead and use SQL JOINs for pattern search instead of O(n^m) backtracking.

**Architecture:** Create a SQLite singleton (`src/lib/mock-db.ts`) that auto-seeds from existing JSON files on first access. Rewrite the 3 mock services to use SQL. Routers, hooks, components, and types stay untouched.

**Tech Stack:** `better-sqlite3` (npm), existing JSON data files

---

### Task 1: Install `better-sqlite3`

**Step 1: Install packages**

Run: `npm install better-sqlite3 && npm install -D @types/better-sqlite3`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add better-sqlite3 dependency"
```

---

### Task 2: Create SQLite singleton (`src/lib/mock-db.ts`)

**Files:**
- Create: `src/lib/mock-db.ts`

This module:
- Opens (or creates) `src/lib/mock-data/mock.db` on first call
- Creates `entity` and `relationship` tables with indexes
- Seeds from `dummyData.json` + `googleOrgData.json` if tables are empty
- Exports a `getDb()` function returning the singleton

**Step 1: Create the module**

```typescript
// src/lib/mock-db.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface MockDataFile {
  entities: { id: string; labelNormalized: string; type: string }[];
  relationships: { relationshipId: string; predicate: string; sourceEntityId: string; relatedEntityId: string }[];
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolve(process.cwd(), 'src/lib/mock-data/mock.db');
  db = new Database(dbPath);

  // Enable WAL mode for better read performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity (
      id TEXT PRIMARY KEY,
      label_normalized TEXT NOT NULL,
      type TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS relationship (
      relationship_id TEXT PRIMARY KEY,
      predicate TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      related_entity_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
    CREATE INDEX IF NOT EXISTS idx_entity_label ON entity(label_normalized COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_rel_source ON relationship(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_related ON relationship(related_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_predicate ON relationship(predicate);
  `);

  // Seed if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM entity').get() as { count: number };
  if (count.count === 0) {
    const dummyData: MockDataFile = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/lib/mock-data/dummyData.json'), 'utf-8')
    );
    const googleData: MockDataFile = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/lib/mock-data/googleOrgData.json'), 'utf-8')
    );

    const insertEntity = db.prepare('INSERT OR IGNORE INTO entity (id, label_normalized, type) VALUES (?, ?, ?)');
    const insertRel = db.prepare(
      'INSERT OR IGNORE INTO relationship (relationship_id, predicate, source_entity_id, related_entity_id) VALUES (?, ?, ?, ?)'
    );

    const seedAll = db.transaction(() => {
      for (const e of [...dummyData.entities, ...googleData.entities]) {
        insertEntity.run(e.id, e.labelNormalized, e.type);
      }
      for (const r of [...dummyData.relationships, ...googleData.relationships]) {
        insertRel.run(r.relationshipId, r.predicate, r.sourceEntityId, r.relatedEntityId);
      }
    });

    seedAll();
  }

  return db;
}
```

**Step 2: Add `mock.db` to `.gitignore`**

Add line: `src/lib/mock-data/mock.db`

**Step 3: Commit**

```bash
git add src/lib/mock-db.ts .gitignore
git commit -m "feat: add SQLite singleton for mock data with auto-seed"
```

---

### Task 3: Rewrite entity mock service to use SQLite

**Files:**
- Modify: `src/features/entity-search/server/services/entity.mock-service.ts`

Replace all MongoDB queries with SQLite queries. Keep the same function signatures and return types.

**Step 1: Rewrite the service**

```typescript
// src/features/entity-search/server/services/entity.mock-service.ts
import 'server-only';

import { getDb } from '@/lib/mock-db';
import type { EntityResponse, RelatedEntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/**
 * Simulates external API search endpoint.
 * Uses SQLite for filtering, sorting, and pagination.
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchMockResponse> {
  const db = getDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.name && params.name.trim() !== '') {
    const name = params.name.trim();
    if (name.endsWith('*')) {
      // Wildcard: prefix match
      conditions.push('label_normalized LIKE ? COLLATE NOCASE');
      values.push(name.slice(0, -1) + '%');
    } else {
      // Contains match
      conditions.push('label_normalized LIKE ? COLLATE NOCASE');
      values.push('%' + name + '%');
    }
  }

  if (params.types && params.types.length > 0) {
    conditions.push(`type IN (${params.types.map(() => '?').join(', ')})`);
    values.push(...params.types);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
  const offset = (params.pageNumber - 1) * params.pageSize;

  const entities = db.prepare(
    `SELECT id, label_normalized as labelNormalized, type FROM entity ${where} ORDER BY label_normalized COLLATE NOCASE ${sortDir} LIMIT ? OFFSET ?`
  ).all(...values, params.pageSize, offset) as EntityResponse[];

  const totalCount = (db.prepare(
    `SELECT COUNT(*) as count FROM entity ${where}`
  ).get(...values) as { count: number }).count;

  return {
    entities,
    totalCount,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize
  };
}

/**
 * Get available entity types.
 */
export async function getEntityTypes(): Promise<string[]> {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT type FROM entity ORDER BY type').all() as { type: string }[];
  return rows.map(r => r.type);
}

/**
 * Get entity by ID with all related entities.
 */
export async function getEntityById(id: string): Promise<EntityResponse | null> {
  const db = getDb();
  const entity = db.prepare(
    'SELECT id, label_normalized as labelNormalized, type FROM entity WHERE id = ?'
  ).get(id) as EntityResponse | undefined;

  if (!entity) return null;

  const relatedEntities = db.prepare(`
    SELECT r.predicate as type, e.id, e.label_normalized as labelNormalized, e.type
    FROM relationship r
    JOIN entity e ON e.id = CASE WHEN r.source_entity_id = ? THEN r.related_entity_id ELSE r.source_entity_id END
    WHERE r.source_entity_id = ? OR r.related_entity_id = ?
  `).all(id, id, id) as (RelatedEntityResponse & { id: string; labelNormalized: string })[];

  if (relatedEntities.length > 0) {
    entity.relatedEntities = relatedEntities.map(r => ({
      type: r.type,
      entity: { id: r.id, labelNormalized: r.labelNormalized, type: (r as any).type }
    }));
  }

  return entity;
}
```

Note: The `getEntityById` related entities query needs care — the `type` column alias conflicts with the entity's `type`. We need to alias properly:

```typescript
// Better query for getEntityById related entities:
const relatedEntities = db.prepare(`
  SELECT r.predicate as relType,
         e.id as eId, e.label_normalized as eLabel, e.type as eType
  FROM relationship r
  JOIN entity e ON e.id = CASE WHEN r.source_entity_id = ? THEN r.related_entity_id ELSE r.source_entity_id END
  WHERE r.source_entity_id = ? OR r.related_entity_id = ?
`).all(id, id, id) as { relType: string; eId: string; eLabel: string; eType: string }[];

entity.relatedEntities = relatedEntities.map(r => ({
  type: r.relType,
  entity: { id: r.eId, labelNormalized: r.eLabel, type: r.eType }
}));
```

**Step 2: Run existing tests to verify**

Run: `npm test -- --testPathPattern="entity.mock-service.test"`
Expected: All tests pass (same behavior, different backend)

**Step 3: Commit**

```bash
git add src/features/entity-search/server/services/entity.mock-service.ts
git commit -m "refactor: entity mock service from MongoDB to SQLite"
```

---

### Task 4: Rewrite pattern service to use SQLite JOINs

**Files:**
- Modify: `src/features/pattern-search/server/services/pattern.service.ts`

This is the big performance win. Replace the backtracking algorithm with dynamically-built SQL JOINs.

**Step 1: Rewrite the service**

Key approach:
- For each pattern node → add `entity` table alias (e.g., `e0`, `e1`, `e2`)
- For each pattern edge → add `relationship` table JOIN (e.g., `r0`, `r1`)
- Node type filters → `WHERE e0.type = ?`
- Node attribute filters (glob on labelNormalized) → `WHERE e0.label_normalized LIKE ?`
- Edge predicate filters → `AND r0.predicate IN (?)`
- Edges are bidirectional → `(r.source = A AND r.related = B) OR (r.source = B AND r.related = A)`
- Pagination → `LIMIT ? OFFSET ?`
- For totalCount → wrap in `SELECT COUNT(*)`

```typescript
// src/features/pattern-search/server/services/pattern.service.ts
import 'server-only';

import { getDb } from '@/lib/mock-db';
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';
import type { PatternSearchParams, PatternSearchResponse, PatternMatch, PatternNode, PatternEdge } from '../../types';

/** Convert glob pattern to SQL LIKE pattern */
function globToLike(pattern: string): string {
  // Replace glob wildcards: * → %, ? → _
  return pattern.replace(/\*/g, '%').replace(/\?/g, '_');
}

/** Build SQL query for pattern matching */
function buildPatternQuery(
  nodes: PatternNode[],
  edges: PatternEdge[],
  options: { countOnly?: boolean; sortDirection?: 'asc' | 'desc'; limit?: number; offset?: number }
): { sql: string; params: unknown[] } {
  // Sort nodes by label for consistent column ordering
  const sortedNodes = [...nodes].sort((a, b) => a.label.localeCompare(b.label));
  const nodeIndexMap = new Map(sortedNodes.map((n, i) => [n.id, i]));

  const params: unknown[] = [];

  // SELECT: entity columns for each node
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

  // FROM: first entity table
  let from = `FROM entity e0`;

  // JOINs: for each edge, join relationship + target entity
  const joins: string[] = [];
  const joinedNodeIndexes = new Set<number>([0]);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const srcIdx = nodeIndexMap.get(edge.sourceNodeId)!;
    const tgtIdx = nodeIndexMap.get(edge.targetNodeId)!;

    // Determine which node is already joined and which is new
    const knownIdx = joinedNodeIndexes.has(srcIdx) ? srcIdx : tgtIdx;
    const newIdx = knownIdx === srcIdx ? tgtIdx : srcIdx;

    // Join relationship (bidirectional)
    const relJoin = `JOIN relationship r${i} ON (r${i}.source_entity_id = e${knownIdx}.id AND r${i}.related_entity_id = e${newIdx}.id) OR (r${i}.source_entity_id = e${newIdx}.id AND r${i}.related_entity_id = e${knownIdx}.id)`;

    // Predicate filter
    let predFilter = '';
    if (edge.predicates.length > 0) {
      predFilter = ` AND r${i}.predicate IN (${edge.predicates.map(() => '?').join(', ')})`;
      params.push(...edge.predicates);
    }

    if (!joinedNodeIndexes.has(newIdx)) {
      // New entity node
      joins.push(`${relJoin}${predFilter}`);
      joins.push(`JOIN entity e${newIdx} ON e${newIdx}.id = CASE WHEN r${i}.source_entity_id = e${knownIdx}.id THEN r${i}.related_entity_id ELSE r${i}.source_entity_id END`);
      joinedNodeIndexes.add(newIdx);
    } else {
      // Both nodes already joined - just add relationship constraint
      joins.push(`${relJoin}${predFilter}`);
    }
  }

  // Handle disconnected nodes (not connected by any edge)
  for (let i = 1; i < sortedNodes.length; i++) {
    if (!joinedNodeIndexes.has(i)) {
      joins.push(`CROSS JOIN entity e${i}`);
      joinedNodeIndexes.add(i);
    }
  }

  // WHERE: node type + attribute filters, and ensure distinct entities per match
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

  // Ensure no entity is used twice in a match
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
 * Search for pattern matches using SQL JOINs.
 */
export async function searchPattern(params: PatternSearchParams): Promise<PatternSearchResponse> {
  const { pattern, pageSize, pageNumber, sortDirection = 'asc' } = params;

  if (pattern.nodes.length === 0) {
    return { matches: [], totalCount: 0, pageNumber, pageSize };
  }

  const db = getDb();
  const offset = (pageNumber - 1) * pageSize;

  // Get total count
  const countQuery = buildPatternQuery(pattern.nodes, pattern.edges, { countOnly: true });
  const totalCount = (db.prepare(countQuery.sql).get(...countQuery.params) as { count: number }).count;

  // Get paginated results
  const dataQuery = buildPatternQuery(pattern.nodes, pattern.edges, {
    sortDirection,
    limit: pageSize,
    offset
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
 * Get available relationship predicates.
 */
export async function getPredicates(): Promise<string[]> {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT predicate FROM relationship ORDER BY predicate').all() as { predicate: string }[];
  return rows.map(r => r.predicate);
}
```

**Step 2: Run existing tests**

Run: `npm test -- --testPathPattern="pattern.service.test"`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/features/pattern-search/server/services/pattern.service.ts
git commit -m "refactor: pattern search from backtracking to SQL JOINs"
```

---

### Task 5: Rewrite workspace mock service to use SQLite

**Files:**
- Modify: `src/features/workspace/server/services/workspace.mock-service.ts`

Only the MongoDB lookup functions change. The JSON file persistence for workspace state stays the same.

**Step 1: Rewrite MongoDB calls to SQLite**

Replace:
- `MockEntityCollection.find({ id: { $in: newEntityIds } }).lean()` → `SELECT ... WHERE id IN (...)`
- `MockRelationshipCollection.find({ $or: [...] }).lean()` → `SELECT ... WHERE (source = ? AND related IN (...)) OR (related = ? AND source IN (...))`

```typescript
// Replace MongoDB imports with:
import { getDb } from '@/lib/mock-db';

// Replace MockEntityCollection.find({ id: { $in: newEntityIds } }).lean() with:
const placeholders = newEntityIds.map(() => '?').join(', ');
const newEntities = db.prepare(
  `SELECT id, label_normalized as labelNormalized, type FROM entity WHERE id IN (${placeholders})`
).all(...newEntityIds) as EntityResponse[];

// Replace MockRelationshipCollection.find({ $or: [...] }).lean() with:
const existingPlaceholders = existingIds.map(() => '?').join(', ');
const relationships = db.prepare(`
  SELECT relationship_id as relationshipId, predicate, source_entity_id as sourceEntityId, related_entity_id as relatedEntityId
  FROM relationship
  WHERE (source_entity_id = ? AND related_entity_id IN (${existingPlaceholders}))
     OR (related_entity_id = ? AND source_entity_id IN (${existingPlaceholders}))
`).all(entityId, ...existingIds, entityId, ...existingIds);
```

**Step 2: Run existing tests**

Run: `npm test -- --testPathPattern="workspace.mock-service.test"`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/features/workspace/server/services/workspace.mock-service.ts
git commit -m "refactor: workspace mock service from MongoDB to SQLite"
```

---

### Task 6: Clean up MongoDB mock artifacts

**Files:**
- Delete: `src/collections/mock-entity.collection.ts`
- Delete: `src/collections/mock-relationship.collection.ts`
- Delete: `scripts/seed-mock-data.ts`
- Modify: `package.json` (remove `db:seed` script if it exists)

**Step 1: Remove files and references**

Verify no other files import the mock collections before deleting.

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove MongoDB mock collections and seed script"
```

---

### Task 7: Update tests to remove mongoose setup

**Files:**
- Modify: `src/features/entity-search/server/services/entity.mock-service.test.ts`
- Modify: `src/features/pattern-search/server/services/pattern.service.test.ts`
- Modify: `src/features/workspace/server/services/workspace.mock-service.test.ts`

Remove `mongoose.connect()` / `mongoose.disconnect()` from `beforeAll`/`afterAll` in all test files. SQLite auto-seeds so no DB setup is needed.

**Step 1: Update test files**

Remove the mongoose imports and connection lifecycle from each test file.

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/features/entity-search/server/services/entity.mock-service.test.ts src/features/pattern-search/server/services/pattern.service.test.ts src/features/workspace/server/services/workspace.mock-service.test.ts
git commit -m "test: remove mongoose setup from mock service tests"
```
