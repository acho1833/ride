# Pattern Search Performance Optimization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate slow pattern search queries when a middle-chain entity has 10k+ relationships by using a pre-duplicated directed relationship table and merging the COUNT query into the data query.

**Architecture:** Add a `relationship_directed` table that stores each relationship twice (one per direction). This eliminates the OR and CASE expressions in JOINs that prevent index usage. Also merge the separate COUNT(*) query into the data query using `COUNT(*) OVER()` window function. The pattern service query builder gets *simpler* — fewer lines, not more.

**Tech Stack:** SQLite (sql.js), existing pattern search service

---

### Task 1: Add `relationship_directed` table to DDL

**Files:**
- Modify: `src/lib/mock-db.ts:9-53` (DDL string)

**Step 1: Add table and indexes to DDL**

In `src/lib/mock-db.ts`, add the following to the DDL string after the existing `relationship` indexes (after line 25):

```sql
CREATE TABLE IF NOT EXISTS relationship_directed (
  relationship_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rd_from ON relationship_directed(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_rd_from_to ON relationship_directed(from_entity_id, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_rd_from_pred ON relationship_directed(from_entity_id, predicate);
```

**Step 2: Add auto-populate trigger after DDL exec**

After `dbWrapper.exec(DDL)` in `initMockDb()` (line 158), add a one-time populate step that copies existing `relationship` rows into `relationship_directed` (both directions). This ensures the table is populated when the server starts with an existing `mock.db`:

```typescript
// Populate relationship_directed from existing relationship data (idempotent)
dbWrapper.exec(`
  INSERT OR IGNORE INTO relationship_directed (relationship_id, predicate, from_entity_id, to_entity_id)
  SELECT relationship_id, predicate, source_entity_id, related_entity_id FROM relationship
  WHERE NOT EXISTS (SELECT 1 FROM relationship_directed LIMIT 1);
  INSERT OR IGNORE INTO relationship_directed (relationship_id, predicate, from_entity_id, to_entity_id)
  SELECT relationship_id, predicate, related_entity_id, source_entity_id FROM relationship
  WHERE (SELECT COUNT(*) FROM relationship_directed) <= (SELECT COUNT(*) FROM relationship);
`);
```

Wait — sql.js `exec` doesn't handle this well with subqueries across statements. Simpler approach: just always repopulate on startup if empty.

Actually, the simplest approach: after DDL, just run:

```typescript
// Populate relationship_directed if empty (both directions of each relationship)
const count = dbWrapper.prepare('SELECT COUNT(*) as c FROM relationship_directed').get() as { c: number } | undefined;
if (!count || count.c === 0) {
  dbWrapper.exec(`
    INSERT INTO relationship_directed (relationship_id, predicate, from_entity_id, to_entity_id)
    SELECT relationship_id, predicate, source_entity_id, related_entity_id FROM relationship;
  `);
  dbWrapper.exec(`
    INSERT INTO relationship_directed (relationship_id, predicate, from_entity_id, to_entity_id)
    SELECT relationship_id, predicate, related_entity_id, source_entity_id FROM relationship;
  `);
}
```

**Step 3: Run tests to verify nothing breaks**

Run: `npm test -- --testPathPattern=pattern.service`
Expected: All existing tests PASS (the new table exists but isn't used yet)

**Step 4: Commit**

```bash
git add src/lib/mock-db.ts
git commit -m "feat: add relationship_directed table with auto-populate on startup"
```

---

### Task 2: Add `relationship_directed` to seed script

**Files:**
- Modify: `scripts/generate-dummy-data.ts:1182-1219` (createAndPopulateDatabase function)

**Step 1: Add table and indexes to seed script DDL**

In `scripts/generate-dummy-data.ts`, add the same `relationship_directed` table creation SQL after the existing relationship indexes (around line 1198):

```sql
CREATE TABLE IF NOT EXISTS relationship_directed (
  relationship_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rd_from ON relationship_directed(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_rd_from_to ON relationship_directed(from_entity_id, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_rd_from_pred ON relationship_directed(from_entity_id, predicate);
```

**Step 2: Add dual inserts for each relationship**

After the existing relationship insert loop (around line 1216), add two inserts per relationship into `relationship_directed`:

```typescript
for (const r of dataset.relationships) {
  db.run(
    'INSERT OR IGNORE INTO relationship_directed (relationship_id, predicate, from_entity_id, to_entity_id) VALUES (?, ?, ?, ?)',
    [r.relationshipId, r.predicate, r.sourceEntityId, r.relatedEntityId]
  );
  db.run(
    'INSERT OR IGNORE INTO relationship_directed (relationship_id, predicate, from_entity_id, to_entity_id) VALUES (?, ?, ?, ?)',
    [r.relationshipId, r.predicate, r.relatedEntityId, r.sourceEntityId]
  );
}
```

**Step 3: Commit**

```bash
git add scripts/generate-dummy-data.ts
git commit -m "feat: seed relationship_directed table in data generation script"
```

---

### Task 3: Rewrite `buildPatternQuery` to use `relationship_directed`

**Files:**
- Modify: `src/features/pattern-search/server/services/pattern.service.ts:14-123`

This is the core change. The query builder becomes simpler.

**Step 1: Write the failing test**

Add a new test to `pattern.service.test.ts` that verifies the search still works correctly and the response includes `totalCount` (which will now come from the window function):

```typescript
it('returns correct totalCount with window function', async () => {
  const result = await searchPattern({
    pattern: {
      nodes: [
        {
          id: 'n1',
          label: 'Node A',
          type: 'Person',
          filters: [],
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    },
    pageSize: 5,
    pageNumber: 1
  });

  // totalCount should be greater than pageSize (we have more than 5 Person entities)
  expect(result.totalCount).toBeGreaterThan(5);
  expect(result.matches.length).toBe(5);
});
```

**Step 2: Run test to verify it passes with current implementation**

Run: `npm test -- --testPathPattern=pattern.service`
Expected: PASS (this test validates current behavior before we change it)

**Step 3: Rewrite `buildPatternQuery`**

Replace the entire `buildPatternQuery` function. Key changes:
1. Use `relationship_directed` instead of `relationship`
2. Simple `r.from_entity_id = eX.id` joins (no OR, no CASE)
3. Single query with `COUNT(*) OVER() as total_count` (no separate count query)

```typescript
/** Build SQL query for pattern matching */
function buildPatternQuery(
  nodes: PatternNode[],
  edges: PatternEdge[],
  options: { sortDirection?: 'asc' | 'desc'; limit?: number; offset?: number }
): { sql: string; params: unknown[] } {
  const sortedNodes = [...nodes].sort((a, b) => a.label.localeCompare(b.label));
  const nodeIndexMap = new Map(sortedNodes.map((n, i) => [n.id, i]));
  const params: unknown[] = [];

  // SELECT — always include COUNT(*) OVER() for total
  const cols: string[] = [];
  for (let i = 0; i < sortedNodes.length; i++) {
    cols.push(`e${i}.id as e${i}_id, e${i}.label_normalized as e${i}_label, e${i}.type as e${i}_type`);
  }
  for (let i = 0; i < edges.length; i++) {
    cols.push(
      `r${i}.relationship_id as r${i}_rid, r${i}.predicate as r${i}_pred, r${i}.from_entity_id as r${i}_src, r${i}.to_entity_id as r${i}_rel`
    );
  }
  cols.push('COUNT(*) OVER() as total_count');
  const select = `SELECT ${cols.join(', ')}`;

  // FROM
  const from = `FROM entity e0`;

  // JOINs — simple directional joins using relationship_directed
  const joins: string[] = [];
  const joinedNodeIndexes = new Set<number>([0]);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const srcIdx = nodeIndexMap.get(edge.sourceNodeId)!;
    const tgtIdx = nodeIndexMap.get(edge.targetNodeId)!;

    const knownIdx = joinedNodeIndexes.has(srcIdx) ? srcIdx : tgtIdx;
    const newIdx = knownIdx === srcIdx ? tgtIdx : srcIdx;

    // Simple directional join — no OR needed
    let relJoin = `JOIN relationship_directed r${i} ON r${i}.from_entity_id = e${knownIdx}.id`;

    if (edge.predicates.length > 0) {
      relJoin += ` AND r${i}.predicate IN (${edge.predicates.map(() => '?').join(', ')})`;
      params.push(...edge.predicates);
    }

    if (!joinedNodeIndexes.has(newIdx)) {
      joins.push(relJoin);
      // Simple equality join — no CASE needed
      joins.push(`JOIN entity e${newIdx} ON e${newIdx}.id = r${i}.to_entity_id`);
      joinedNodeIndexes.add(newIdx);
    } else {
      // Both nodes already joined — add relationship with both endpoints constrained
      joins.push(relJoin + ` AND r${i}.to_entity_id = e${newIdx}.id`);
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

  const orderBy = `ORDER BY e0.label_normalized COLLATE NOCASE ${options.sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
  let limitOffset = '';
  if (options.limit !== undefined) {
    limitOffset = `LIMIT ? OFFSET ?`;
    params.push(options.limit, options.offset ?? 0);
  }

  const sql = [select, from, ...joins, where, orderBy, limitOffset].filter(Boolean).join('\n');
  return { sql, params };
}
```

**Step 4: Rewrite `searchPattern` to use single query**

Replace the `searchPattern` function. Key change: one query instead of two, extract `total_count` from window function.

```typescript
export async function searchPattern(params: PatternSearchParams): Promise<PatternSearchResponse> {
  const { pattern, pageSize, pageNumber, sortDirection = 'asc' } = params;

  if (pattern.nodes.length === 0) {
    return { matches: [], totalCount: 0, pageNumber, pageSize };
  }

  const db = getDb();
  const offset = (pageNumber - 1) * pageSize;

  // Single query — COUNT(*) OVER() provides totalCount without a separate query
  const query = buildPatternQuery(pattern.nodes, pattern.edges, {
    sortDirection,
    limit: pageSize,
    offset
  });

  const rows = db.prepare(query.sql).all(...query.params) as Record<string, string | number>[];
  const sortedNodes = [...pattern.nodes].sort((a, b) => a.label.localeCompare(b.label));

  // Extract totalCount from window function (same value on every row, 0 if no rows)
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  const matches: PatternMatch[] = rows.map(row => {
    const entities: Entity[] = sortedNodes.map((_, i) => ({
      id: row[`e${i}_id`] as string,
      labelNormalized: row[`e${i}_label`] as string,
      type: row[`e${i}_type`] as string
    }));

    const relationships: Relationship[] = pattern.edges.map((_, i) => ({
      relationshipId: row[`r${i}_rid`] as string,
      predicate: row[`r${i}_pred`] as string,
      sourceEntityId: row[`r${i}_src`] as string,
      relatedEntityId: row[`r${i}_rel`] as string
    }));

    return { entities, relationships };
  });

  return { matches, totalCount, pageNumber, pageSize };
}
```

**Note on relationship direction in results:** The `r${i}_src` and `r${i}_rel` columns now come from `relationship_directed.from_entity_id` and `to_entity_id`. Since we stored both directions, the "from" side is always the `knownIdx` entity. The original `relationship` table's `source_entity_id`/`related_entity_id` semantics are preserved because the `relationship_id` is the same — but the columns returned are from the directed copy. The UI uses `relationship_id` + `predicate` + `sourceEntityId` + `relatedEntityId`, so the field mapping (`r${i}_src` → `sourceEntityId`, `r${i}_rel` → `relatedEntityId`) still works — it just reflects the traversal direction rather than the original direction. This is fine because the `pattern-match-row.component.tsx` already handles bidirectional display.

**Step 5: Run all tests**

Run: `npm test -- --testPathPattern=pattern.service`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/features/pattern-search/server/services/pattern.service.ts
git add src/features/pattern-search/server/services/pattern.service.test.ts
git commit -m "perf: rewrite pattern search to use relationship_directed and window COUNT"
```

---

### Task 4: Regenerate mock data

**Step 1: Run the data generation script to rebuild mock.db with the new table**

Run: `npx tsx scripts/generate-dummy-data.ts`
Expected: Completes successfully, prints entity/relationship counts

**Step 2: Start dev server and manually test**

Run: `npm run dev`
Test: Open advanced search, create a 3-node chain pattern (A → B → C), verify results load significantly faster than before.

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit the regenerated database**

```bash
git add src/lib/mock-data/mock.db
git commit -m "chore: regenerate mock.db with relationship_directed table"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/mock-db.ts` | Add `relationship_directed` table DDL + auto-populate on startup |
| `scripts/generate-dummy-data.ts` | Seed `relationship_directed` with both directions |
| `src/features/pattern-search/server/services/pattern.service.ts` | Rewrite query builder: use directed table, window COUNT, simpler JOINs |
| `src/features/pattern-search/server/services/pattern.service.test.ts` | Add totalCount window function test |

**What gets eliminated:**
- OR condition in relationship JOINs (was preventing index usage)
- CASE expression in entity JOINs (was preventing PK index usage)
- Separate COUNT(*) query (was doubling total query time)
- `countOnly` option in `buildPatternQuery` (no longer needed)

**What the query looks like after (3-node chain A → B → C):**
```sql
SELECT e0.*, e1.*, e2.*, r0.*, r1.*, COUNT(*) OVER() as total_count
FROM entity e0
JOIN relationship_directed r0 ON r0.from_entity_id = e0.id
JOIN entity e1 ON e1.id = r0.to_entity_id
JOIN relationship_directed r1 ON r1.from_entity_id = e1.id
JOIN entity e2 ON e2.id = r1.to_entity_id
WHERE e0.id != e1.id AND e0.id != e2.id AND e1.id != e2.id
ORDER BY e0.label_normalized COLLATE NOCASE ASC
LIMIT 50 OFFSET 0
```

Every JOIN is a simple equality — fully index-driven.
