# Microsoft 20K Seed Data — Direct-to-SQLite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace JSON-based seed data with a deterministic script that generates all data (dummy, Google, Microsoft 20K) directly into SQLite, using fixed seeds for reproducibility and worker threads for parallel generation.

**Architecture:** Rewrite `generate-dummy-data.ts` to generate entities/relationships in-memory (using worker threads for the heavy Microsoft dataset), then batch-insert directly into SQLite. Remove JSON file dependency from `mock-db.ts`. Add diverse entity types (Vehicle, Location, Device, Event) alongside Person/Organization.

**Tech Stack:** faker.js (seeded), better-sqlite3, Node.js worker_threads

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `scripts/generate-dummy-data.ts` | Rewrite | Generate all data directly to SQLite (no JSON) |
| `src/lib/mock-db.ts` | Simplify | Remove JSON-reading seeding logic; just open DB |
| `src/lib/mock-data/entities.ts` | Update | Add new entity types |
| `src/const.ts` | Update | Add icon config for new entity types |
| `src/features/entity-search/server/services/entity.mock-service.test.ts` | Update | Fix entity type count assertion |
| `.gitignore` | Verify | Already has `mock.db` — no change needed |
| `src/lib/mock-data/dummyData.json` | Delete | No longer needed |
| `src/lib/mock-data/googleOrgData.json` | Delete | No longer needed |

---

### Task 1: Update entity types and icon config

**Files:**
- Modify: `src/lib/mock-data/entities.ts`
- Modify: `src/const.ts`

**Step 1:** Add new entity types to `MOCK_ENTITY_TYPES` in `src/lib/mock-data/entities.ts`:

```typescript
export const MOCK_ENTITY_TYPES = ['Person', 'Organization', 'Vehicle', 'Location', 'Device', 'Event'] as const;
```

**Step 2:** Add icon mappings in `src/const.ts` for new entity types. Use Remix Icon unicodes:

```typescript
export const ENTITY_ICON_CONFIG: Record<string, { cssClass: string; unicode: string }> = {
  Person: { cssClass: 'ri-user-line', unicode: 'F264' },
  Organization: { cssClass: 'ri-building-2-line', unicode: 'EB09' },
  Vehicle: { cssClass: 'ri-car-line', unicode: 'EB3A' },
  Location: { cssClass: 'ri-map-pin-line', unicode: 'EF08' },
  Device: { cssClass: 'ri-smartphone-line', unicode: 'F15E' },
  Event: { cssClass: 'ri-calendar-event-line', unicode: 'EB1E' }
};
```

**Step 3:** Add new relationship predicates to `RELATIONSHIP_PREDICATES` in `src/lib/mock-data/entities.ts`:

```typescript
export const RELATIONSHIP_PREDICATES = [
  'works_for', 'knows', 'manages', 'reports_to', 'collaborates_with', 'part_of',
  'owns', 'located_at', 'attends', 'operates'
] as const;
```

---

### Task 2: Rewrite generate script — direct SQLite output

**Files:**
- Rewrite: `scripts/generate-dummy-data.ts`

**Overview:** The script will:
1. Delete existing `mock.db` if present
2. Create fresh SQLite database with tables and indexes
3. Generate dummy data (same seed 12345 — same entities as before)
4. Generate Google org data (same seed 54321 — same entities as before)
5. Generate Microsoft org data (seed 99999 — ~20,000 entities) using worker threads
6. Batch-insert all data into SQLite

**Step 1:** Create the new script structure:

```typescript
import { faker } from '@faker-js/faker';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { RELATIONSHIP_PREDICATES } from '@/lib/mock-data/entities';

// ============================================================================
// Constants
// ============================================================================

const DB_PATH = path.join(__dirname, '../src/lib/mock-data/mock.db');
const WORKSPACE_STATE_PATH = path.join(__dirname, '../src/lib/mock-data/workspaceState.json');

const SEEDS = {
  DUMMY: 12345,
  GOOGLE: 54321,
  MICROSOFT: 99999
} as const;

interface GeneratedEntity {
  id: string;
  labelNormalized: string;
  type: string;
}

interface GeneratedRelationship {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}

interface GeneratedData {
  entities: GeneratedEntity[];
  relationships: GeneratedRelationship[];
}
```

**Step 2:** Keep existing `generateDummyData()` and `generateGoogleOrgData()` functions largely unchanged but return in-memory data instead of writing JSON. Diversify entity types in the dummy data generation (some Vehicles, Locations, Devices, Events alongside Person/Organization).

**Step 3:** Create `generateMicrosoftOrgData()` that produces ~20,000 entities:

```
Microsoft HQ (1 Organization)
├── Divisions: 15 (Azure, Office 365, Windows, Xbox, LinkedIn, GitHub, Bing, Surface, Teams, Dynamics, Power Platform, Outlook, OneDrive, Visual Studio, Copilot)
├── Teams: 300 (under divisions)
├── Executives: 40 (Person)
├── Directors: 300 (Person)
├── Managers: 2,000 (Person)
├── Employees: 15,000 (Person)
├── Contractors: 1,500 (Person)
├── Partners: 150 (Organization)
├── Fleet Vehicles: 200 (Vehicle)
├── Office Locations: 100 (Location)
├── Company Devices: 300 (Device)
├── Company Events: 100 (Event)
Total: ~20,006
```

Relationships:
- HQ → all entities via `part_of`
- Divisions → teams via `manages`
- Executives → divisions via `manages`, cross-collaborate
- Directors → teams via `manages`, report to executives
- Managers → report to directors, work for teams
- Employees → report to managers, work for teams, know each other
- Contractors → work for teams, report to managers
- Partners → collaborate with divisions
- Vehicles → `owned` by Microsoft HQ, `operates` by random employees
- Locations → Microsoft HQ `located_at`, divisions `located_at`
- Devices → `owns` by employees, `part_of` teams
- Events → `attends` by employees/executives, `part_of` divisions

**Step 4:** For parallel processing, split Microsoft employee generation into chunks across worker threads. Each worker:
- Gets a chunk range (e.g., employees 1-3750, 3751-7500, etc.)
- Gets a deterministic seed derived from master seed + chunk index
- Generates entities and relationships for its chunk
- Returns results to main thread

Main thread collects all results, deduplicates relationship pairs, and batch-inserts into SQLite.

**Step 5:** SQLite insertion — create database, tables, indexes, then use a single transaction with prepared statements for fast batch insert:

```typescript
function insertIntoDb(allData: GeneratedData[]) {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE entity (id TEXT PRIMARY KEY, label_normalized TEXT NOT NULL, type TEXT NOT NULL);
    CREATE TABLE relationship (relationship_id TEXT PRIMARY KEY, predicate TEXT NOT NULL, source_entity_id TEXT NOT NULL, related_entity_id TEXT NOT NULL);
    CREATE INDEX idx_entity_type ON entity(type);
    CREATE INDEX idx_entity_label ON entity(label_normalized COLLATE NOCASE);
    CREATE INDEX idx_rel_source ON relationship(source_entity_id);
    CREATE INDEX idx_rel_related ON relationship(related_entity_id);
    CREATE INDEX idx_rel_predicate ON relationship(predicate);
  `);

  const insertEntity = db.prepare('INSERT OR IGNORE INTO entity VALUES (?, ?, ?)');
  const insertRel = db.prepare('INSERT OR IGNORE INTO relationship VALUES (?, ?, ?, ?)');

  const tx = db.transaction(() => {
    for (const data of allData) {
      for (const e of data.entities) insertEntity.run(e.id, e.labelNormalized, e.type);
      for (const r of data.relationships) insertRel.run(r.relationshipId, r.predicate, r.sourceEntityId, r.relatedEntityId);
    }
  });
  tx();
  db.close();
}
```

---

### Task 3: Simplify mock-db.ts

**Files:**
- Modify: `src/lib/mock-db.ts`

Remove the JSON-reading seeding logic. The DB should already exist (created by the generate script). Keep table creation as a safety net but remove JSON imports.

```typescript
import 'server-only';
import Database from 'better-sqlite3';
import { resolve } from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = resolve(process.cwd(), 'src/lib/mock-data/mock.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create tables if they don't exist (safety net)
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity (id TEXT PRIMARY KEY, label_normalized TEXT NOT NULL, type TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS relationship (relationship_id TEXT PRIMARY KEY, predicate TEXT NOT NULL, source_entity_id TEXT NOT NULL, related_entity_id TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
    CREATE INDEX IF NOT EXISTS idx_entity_label ON entity(label_normalized COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_rel_source ON relationship(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_related ON relationship(related_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_predicate ON relationship(predicate);
  `);

  return db;
}
```

---

### Task 4: Delete JSON data files

**Files:**
- Delete: `src/lib/mock-data/dummyData.json`
- Delete: `src/lib/mock-data/googleOrgData.json`

---

### Task 5: Update test assertions

**Files:**
- Modify: `src/features/entity-search/server/services/entity.mock-service.test.ts`

**Step 1:** Update the entity types test to account for new types:

```typescript
it('returns distinct entity types', async () => {
  const types = await getEntityTypes();
  expect(types).toContain('Person');
  expect(types).toContain('Organization');
  expect(types.length).toBeGreaterThanOrEqual(2);
});
```

**Step 2:** The `google-hq` entity test should still pass since we're generating the same Google data with the same seed. The `microsoft-hq` entity can optionally be tested too.

---

### Task 6: Run generation, verify, and test

**Step 1:** Delete existing mock.db:
```bash
rm -f src/lib/mock-data/mock.db src/lib/mock-data/mock.db-wal src/lib/mock-data/mock.db-shm
```

**Step 2:** Run the new generate script:
```bash
npm run test:generate-data
```

Expected output: ~22,400 entities, ~100,000+ relationships generated, written to SQLite.

**Step 3:** Run tests:
```bash
npm test
```

**Step 4:** Start dev server and verify entities are searchable:
```bash
npm run dev
```

Search for "Microsoft" — should find Microsoft HQ and divisions.

---

### Task 7: Commit

```bash
git add scripts/generate-dummy-data.ts src/lib/mock-db.ts src/lib/mock-data/entities.ts src/const.ts src/features/entity-search/server/services/entity.mock-service.test.ts
git rm src/lib/mock-data/dummyData.json src/lib/mock-data/googleOrgData.json
git commit -m "feat: generate 20K Microsoft seed data directly to SQLite with worker threads"
```

---

## Verification Checklist

- [ ] `npm run test:generate-data` produces consistent output on repeated runs (same seed = same data)
- [ ] `mock.db` contains ~22,400 entities and ~100K+ relationships
- [ ] Entity types include Person, Organization, Vehicle, Location, Device, Event
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Searching "Microsoft" in the UI finds entities
- [ ] Searching "Google" still works
- [ ] Graph culling activates when loading Microsoft HQ (20K entities)
