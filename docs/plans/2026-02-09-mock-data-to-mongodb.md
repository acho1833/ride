# Mock Data to MongoDB Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move mock entity/relationship data from JSON files to MongoDB collections for faster searching, and add unit tests for the modified services.

**Architecture:** Create two new Mongoose collections (`MockEntity`, `MockRelationship`) that store the same data currently in `dummyData.json` and `googleOrgData.json`. Create a seed script that generates and inserts mock data into MongoDB. Update the three mock services (`entity.mock-service.ts`, `workspace.mock-service.ts`, `pattern.service.ts`) to query MongoDB instead of in-memory JSON arrays. Add text indexes for fast entity search.

**Tech Stack:** MongoDB/Mongoose, Jest with `mongodb-memory-server` for tests

---

### Task 1: Create MockEntity and MockRelationship Collections

**Files:**
- Create: `src/collections/mock-entity.collection.ts`
- Create: `src/collections/mock-relationship.collection.ts`

**Step 1: Create MockEntity collection**

```typescript
// src/collections/mock-entity.collection.ts
import mongoose, { model, Model, Schema } from 'mongoose';
import { EntityResponse } from '@/models/entity-response.model';

const mockEntitySchema = new Schema<EntityResponse>({
  id: { type: String, required: true, unique: true },
  labelNormalized: { type: String, required: true },
  type: { type: String, required: true }
});

// Index for text search on labelNormalized
mockEntitySchema.index({ labelNormalized: 1 });
// Index for type filtering
mockEntitySchema.index({ type: 1 });

const MockEntityCollection = (mongoose.models.MockEntity ??
  model<EntityResponse>('MockEntity', mockEntitySchema, 'mock_entity')) as Model<EntityResponse>;

export default MockEntityCollection;
```

**Step 2: Create MockRelationship collection**

```typescript
// src/collections/mock-relationship.collection.ts
import mongoose, { model, Model, Schema } from 'mongoose';
import { RelationshipResponse } from '@/models/workspace-response.model';

const mockRelationshipSchema = new Schema<RelationshipResponse>({
  relationshipId: { type: String, required: true, unique: true },
  predicate: { type: String, required: true },
  sourceEntityId: { type: String, required: true },
  relatedEntityId: { type: String, required: true }
});

// Indexes for relationship lookups
mockRelationshipSchema.index({ sourceEntityId: 1 });
mockRelationshipSchema.index({ relatedEntityId: 1 });
mockRelationshipSchema.index({ sourceEntityId: 1, relatedEntityId: 1 });

const MockRelationshipCollection = (mongoose.models.MockRelationship ??
  model<RelationshipResponse>('MockRelationship', mockRelationshipSchema, 'mock_relationship')) as Model<RelationshipResponse>;

export default MockRelationshipCollection;
```

**Step 3: Commit**

```bash
git add src/collections/mock-entity.collection.ts src/collections/mock-relationship.collection.ts
git commit -m "feat: add MockEntity and MockRelationship Mongoose collections"
```

---

### Task 2: Create Seed Script

**Files:**
- Create: `scripts/seed-mock-data.ts`
- Modify: `package.json` (add `db:seed` script)

**Step 1: Create seed script**

Create `scripts/seed-mock-data.ts` that:
1. Connects to MongoDB (same pattern as `db-reset.ts` for env loading)
2. Imports `dummyData.json` and `googleOrgData.json`
3. Clears existing `mock_entity` and `mock_relationship` collections
4. Inserts all entities and relationships using `insertMany`
5. Logs counts and disconnects

The script should:
- Use the same env-loading pattern from `db-reset.ts`
- Apply the `toJSONPlugin` before operations (needed for Mongoose setup)
- Use `insertMany` with `ordered: false` for performance
- Print entity and relationship counts at the end

**Step 2: Add db:seed script to package.json**

Add to scripts section:
```json
"db:seed": "tsx scripts/seed-mock-data.ts"
```

**Step 3: Run the seed script to verify it works**

```bash
npm run db:seed
```

Expected: Entities and relationships inserted, counts printed.

**Step 4: Commit**

```bash
git add scripts/seed-mock-data.ts package.json
git commit -m "feat: add db:seed script to populate mock data in MongoDB"
```

---

### Task 3: Update entity.mock-service.ts to Query MongoDB

**Files:**
- Modify: `src/features/entity-search/server/services/entity.mock-service.ts`

**Step 1: Rewrite entity.mock-service.ts to use MongoDB**

Replace all `getMockEntities()` / `getMockEntityById()` / `getMockRelationships()` calls with Mongoose queries:

- `searchEntities(params)`:
  - Build a MongoDB `find()` query with:
    - Name filter: use regex (`$regex`) - if ends with `*`, prefix match; otherwise contains match (case-insensitive)
    - Types filter: `{ type: { $in: types } }` when types array is non-empty
  - Use `.sort({ labelNormalized: sortDirection })` for sorting
  - Use `.skip()` and `.limit()` for pagination
  - Use `.countDocuments()` for totalCount

- `getEntityById(id)`:
  - Use `MockEntityCollection.findOne({ id })` to get the entity
  - Use `MockRelationshipCollection.find({ $or: [{ sourceEntityId: id }, { relatedEntityId: id }] })` to get relationships
  - For each relationship, look up the related entity with `MockEntityCollection.findOne({ id: relatedId })`
  - To avoid N+1 queries: collect all relatedIds, do one `MockEntityCollection.find({ id: { $in: relatedIds } })`, then build the response from the map

- `getEntityTypes()`:
  - Use `MockEntityCollection.distinct('type')`

Keep the same function signatures and return types.

**Step 2: Verify the app still works**

```bash
npm run dev
```

Test entity search in the UI.

**Step 3: Commit**

```bash
git add src/features/entity-search/server/services/entity.mock-service.ts
git commit -m "feat: update entity mock service to query MongoDB instead of JSON"
```

---

### Task 4: Update workspace.mock-service.ts to Query MongoDB

**Files:**
- Modify: `src/features/workspace/server/services/workspace.mock-service.ts`

**Step 1: Rewrite workspace.mock-service.ts to use MongoDB**

Replace `getMockEntities()` and `getMockRelationships()` calls:

- `addEntitiesToWorkspace()`:
  - Instead of `entities.find(e => e.id === entityId)`, use `MockEntityCollection.findOne({ id: entityId })`
  - Batch: collect all new entityIds, do `MockEntityCollection.find({ id: { $in: newEntityIds } })`

- `findConnectingRelationships(entityId, existingEntityIds)`:
  - Use `MockRelationshipCollection.find()` with `$or` query:
    ```
    {
      $or: [
        { sourceEntityId: entityId, relatedEntityId: { $in: [...existingEntityIds] } },
        { relatedEntityId: entityId, sourceEntityId: { $in: [...existingEntityIds] } }
      ]
    }
    ```

Keep workspace state persistence in JSON (that's per-user state, not mock data).

**Step 2: Commit**

```bash
git add src/features/workspace/server/services/workspace.mock-service.ts
git commit -m "feat: update workspace mock service to query MongoDB instead of JSON"
```

---

### Task 5: Update pattern.service.ts to Query MongoDB

**Files:**
- Modify: `src/features/pattern-search/server/services/pattern.service.ts`

**Step 1: Rewrite pattern.service.ts to use MongoDB**

Replace `getMockEntities()` and `getMockRelationships()`:

- `searchPattern()`:
  - Load all entities with `MockEntityCollection.find().lean()`
  - Load all relationships with `MockRelationshipCollection.find().lean()`
  - Keep the existing backtracking algorithm as-is (it needs all data in memory for graph traversal)

- `getPredicates()`:
  - Use `MockRelationshipCollection.distinct('predicate')` instead of loading all relationships

**Step 2: Commit**

```bash
git add src/features/pattern-search/server/services/pattern.service.ts
git commit -m "feat: update pattern service to query MongoDB instead of JSON"
```

---

### Task 6: Remove JSON Mock Data Dependencies

**Files:**
- Modify: `src/lib/mock-data/entities.ts` - remove or deprecate
- Modify: `src/lib/mock-data/index.ts` - remove or deprecate

**Step 1: Remove mock-data entity accessor module**

The `entities.ts` file and `index.ts` export `getMockEntities`, `getMockEntityById`, `getMockRelationships` - these are no longer needed by the services after Tasks 3-5.

However, `MOCK_ENTITY_TYPES` and `RELATIONSHIP_PREDICATES` are still used by:
- `generate-dummy-data.ts` (uses `RELATIONSHIP_PREDICATES`)

Check if any other files still import from `@/lib/mock-data`. If only the generate script uses them, move the constants to the generate script or keep them in entities.ts but remove the JSON loading functions.

Update `entities.ts` to only export the constants (remove `getMockEntities`, `getMockEntityById`, `getMockRelationships`, and the JSON imports).

Update `index.ts` to only re-export the constants.

**Step 2: Commit**

```bash
git add src/lib/mock-data/entities.ts src/lib/mock-data/index.ts
git commit -m "refactor: remove JSON-based mock data accessors, keep constants only"
```

---

### Task 7: Install mongodb-memory-server and Set Up Jest for DB Tests

**Files:**
- Modify: `package.json` (add `mongodb-memory-server` dev dependency)
- Modify: `jest.config.ts` (add server test project for node environment)

**Step 1: Install mongodb-memory-server**

```bash
npm install --save-dev mongodb-memory-server
```

**Step 2: Update jest.config.ts to support both jsdom and node environments**

Add a `projects` configuration so service tests (which need real MongoDB) use `node` environment while component tests keep `jsdom`:

```typescript
const config: Config = {
  coverageProvider: 'v8',
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
      testPathIgnorePatterns: ['<rootDir>/src/**/server/'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/server/**/*.test.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
    }
  ]
};
```

**Step 3: Commit**

```bash
git add package.json package-lock.json jest.config.ts
git commit -m "chore: add mongodb-memory-server and configure jest projects for server tests"
```

---

### Task 8: Write Unit Tests for entity.mock-service.ts

**Files:**
- Create: `src/features/entity-search/server/services/entity.mock-service.test.ts`

**Step 1: Write tests**

Tests should:
1. `beforeAll`: Start `MongoMemoryServer`, connect mongoose, apply `toJSONPlugin`
2. `beforeEach`: Clear collections, insert a small known dataset (5-10 entities, 5-10 relationships)
3. `afterAll`: Disconnect, stop memory server

Test cases for `searchEntities`:
- Returns all entities when no name filter
- Filters by name (contains match)
- Filters by name with wildcard prefix match (`"A*"`)
- Filters by types
- Sorts ascending and descending
- Paginates correctly
- Returns correct totalCount

Test cases for `getEntityById`:
- Returns entity with related entities
- Returns null for non-existent ID

Test cases for `getEntityTypes`:
- Returns distinct types from the dataset

**Step 2: Run tests**

```bash
npm test -- --testPathPattern="entity.mock-service.test"
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/features/entity-search/server/services/entity.mock-service.test.ts
git commit -m "test: add unit tests for entity mock service with MongoDB"
```

---

### Task 9: Write Unit Tests for workspace.mock-service.ts

**Files:**
- Create: `src/features/workspace/server/services/workspace.mock-service.test.ts`

**Step 1: Write tests**

Same setup pattern (MongoMemoryServer, seed small dataset).

Test cases:
- `getWorkspaceById`: returns empty workspace for new ID
- `addEntitiesToWorkspace`: adds entities and auto-includes connecting relationships
- `addEntitiesToWorkspace`: skips duplicate entities
- `removeEntitiesFromWorkspace`: removes entities and their relationships
- `setWorkspaceData`: replaces workspace data completely

**Step 2: Run tests**

```bash
npm test -- --testPathPattern="workspace.mock-service.test"
```

**Step 3: Commit**

```bash
git add src/features/workspace/server/services/workspace.mock-service.test.ts
git commit -m "test: add unit tests for workspace mock service with MongoDB"
```

---

### Task 10: Write Unit Tests for pattern.service.ts

**Files:**
- Create: `src/features/pattern-search/server/services/pattern.service.test.ts`

**Step 1: Write tests**

Same setup pattern.

Test cases:
- `searchPattern`: returns empty for empty pattern
- `searchPattern`: matches single node by type
- `searchPattern`: matches two connected nodes
- `searchPattern`: respects predicate filter on edges
- `searchPattern`: paginates results
- `getPredicates`: returns distinct predicates

**Step 2: Run tests**

```bash
npm test -- --testPathPattern="pattern.service.test"
```

**Step 3: Commit**

```bash
git add src/features/pattern-search/server/services/pattern.service.test.ts
git commit -m "test: add unit tests for pattern service with MongoDB"
```

---

### Task 11: Run Full Test Suite and Verify Build

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass.

**Step 2: Run lint**

```bash
npm run lint
```

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Final commit if any fixes needed**

---

### Task 12: Update db:reset to also mention seeding

**Files:**
- Modify: `scripts/db-reset.ts` (add a console log reminder to run `db:seed` after reset)

**Step 1: Add reminder log**

At the end of `resetDatabase()`, after the success message, add:
```typescript
console.log('\nRun "npm run db:seed" to re-populate mock data.');
```

**Step 2: Commit**

```bash
git add scripts/db-reset.ts
git commit -m "chore: add db:seed reminder after db:reset"
```

---

## Review

### Summary of Changes

**New files created:**
- `src/collections/mock-entity.collection.ts` - Mongoose model for mock entities with indexes on `id`, `labelNormalized`, `type`
- `src/collections/mock-relationship.collection.ts` - Mongoose model for mock relationships with indexes on `sourceEntityId`, `relatedEntityId`
- `scripts/seed-mock-data.ts` - Script to load JSON data and insert into MongoDB (`npm run db:seed`)
- `src/__mocks__/server-only.ts` - No-op mock for `server-only` package in tests
- `src/features/entity-search/server/services/entity.mock-service.test.ts` - 12 tests
- `src/features/workspace/server/services/workspace.mock-service.test.ts` - 6 tests
- `src/features/pattern-search/server/services/pattern.service.test.ts` - 6 tests

**Modified files:**
- `src/features/entity-search/server/services/entity.mock-service.ts` - Replaced in-memory array scanning with MongoDB queries (regex search, $in filter, sort, skip/limit, batch fetch)
- `src/features/workspace/server/services/workspace.mock-service.ts` - Replaced `getMockEntities()`/`getMockRelationships()` with MongoDB queries for entity lookup and relationship discovery
- `src/features/pattern-search/server/services/pattern.service.ts` - Replaced JSON data loading with MongoDB `.lean()` queries; uses `distinct()` for predicates
- `src/lib/mock-data/entities.ts` - Stripped to constants only (`MOCK_ENTITY_TYPES`, `RELATIONSHIP_PREDICATES`), removed JSON loading functions
- `src/lib/mock-data/index.ts` - Updated barrel export to only export constants
- `jest.config.ts` - Added `server-only` mock mapping
- `package.json` - Added `db:seed` script
- `scripts/db-reset.ts` - Added reminder to run `db:seed` after reset

**Key decisions during implementation:**
- Used real MongoDB for tests (not mongodb-memory-server) since the seeded data should persist
- Used per-file `@jest-environment node` docblock instead of Jest projects to keep the `next/jest` transformer working for all tests
- Kept workspace state persistence in JSON (per-user state, not mock data)
- JSON files (`dummyData.json`, `googleOrgData.json`) still exist for the seed script to read from

### Verification Results
- Tests: 41/41 pass (4 suites)
- Lint: Clean
- Build: Succeeds
- Seed: 2412 entities, 11453 relationships inserted
