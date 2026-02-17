# Spreadline Entity IDs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add person IDs to spreadline CSV files and propagate IDs through the API response and frontend.

**Architecture:** Generate new `vis-author2/` CSVs with person IDs. Update the service to read ID-based CSVs, match by ID internally, and return an `entities` map in the response. Update the frontend component to convert the new response shape into the formats the SpreadLine library expects.

**Tech Stack:** Node.js script (CSV generation), TypeScript, papaparse, Jest, React

---

### Task 1: Generate vis-author2 CSV files

**Files:**
- Create: `scripts/generate-vis-author2.mjs`
- Create: `data/spreadline/vis-author2/entities.csv`
- Create: `data/spreadline/vis-author2/relations.csv`
- Create: `data/spreadline/vis-author2/citations.csv`

**Step 1: Write the generation script**

```javascript
// scripts/generate-vis-author2.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse, unparse } from 'papaparse';

const SRC = 'data/spreadline/vis-author';
const DST = 'data/spreadline/vis-author2';
mkdirSync(DST, { recursive: true });

function loadCSV(file) {
  return parse(readFileSync(`${SRC}/${file}`, 'utf-8'), {
    header: true, dynamicTyping: true, skipEmptyLines: true
  }).data;
}

const entities = loadCSV('entities.csv');
const relations = loadCSV('relations.csv');
const citations = loadCSV('citations.csv');

// Build name -> id map from unique names across all CSVs
const allNames = new Set();
entities.forEach(r => allNames.add(r.name));
relations.forEach(r => { allNames.add(r.source); allNames.add(r.target); });
citations.forEach(r => allNames.add(r.name));

const nameToId = {};
let counter = 1;
for (const name of [...allNames].sort()) {
  nameToId[name] = `p${String(counter).padStart(4, '0')}`;
  counter++;
}

// entities.csv: add id column
const newEntities = entities.map(r => ({
  id: nameToId[r.name],
  name: r.name,
  year: r.year,
  citationcount: r.citationcount,
  affiliation: r.affiliation
}));

// relations.csv: replace source/target with sourceId/targetId
const newRelations = relations.map(r => ({
  year: r.year,
  sourceId: nameToId[r.source],
  targetId: nameToId[r.target],
  id: r.id,
  type: r.type,
  citationcount: r.citationcount,
  count: r.count
}));

// citations.csv: replace name with entityId
const newCitations = citations.map(r => ({
  entityId: nameToId[r.name],
  year: r.year,
  citationcount: r.citationcount,
  affiliation: r.affiliation,
  paperID: r.paperID
}));

writeFileSync(`${DST}/entities.csv`, unparse(newEntities));
writeFileSync(`${DST}/relations.csv`, unparse(newRelations));
writeFileSync(`${DST}/citations.csv`, unparse(newCitations));

console.log(`Generated ${Object.keys(nameToId).length} unique person IDs`);
console.log(`entities.csv: ${newEntities.length} rows`);
console.log(`relations.csv: ${newRelations.length} rows`);
console.log(`citations.csv: ${newCitations.length} rows`);
```

**Step 2: Run the script**

Run: `node scripts/generate-vis-author2.mjs`
Expected: Three new CSV files in `data/spreadline/vis-author2/`. Console output showing row counts matching originals.

**Step 3: Verify CSV output**

Manually inspect the first few rows of each file:
- `entities.csv` has `id,name,year,citationcount,affiliation` columns
- `relations.csv` has `year,sourceId,targetId,id,type,citationcount,count` columns
- `citations.csv` has `entityId,year,citationcount,affiliation,paperID` columns
- IDs are consistent (same person name = same ID across all files)

**Step 4: Commit**

```bash
git add scripts/generate-vis-author2.mjs data/spreadline/vis-author2/
git commit -m "feat: generate vis-author2 CSV files with person IDs"
```

---

### Task 2: Update service response types and CSV interfaces

**Files:**
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.ts:10-67` (interfaces and response type)

**Step 1: Update CSV row interfaces**

Replace lines 10-30 with:

```typescript
interface RelationRow {
  year: string;
  sourceId: string;
  targetId: string;
  id: string;
  count?: number;
  citationcount?: number;
}

interface EntityRow {
  id: string;
  year: string;
  name: string;
  affiliation: string;
}

interface CitationRow {
  paperID: string;
  year: number;
  entityId: string;
  citationcount: number;
}
```

**Step 2: Update public response types**

Replace lines 32-67 with:

```typescript
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
  dataset: string;
  entities: Record<string, EntityInfo>;
  topology: TopologyEntry[];
  groups: Record<string, string[][]>;
  config: {
    timeDelta: string;
    timeFormat: string;
    squeezeSameCategory: boolean;
    minimize: string;
  };
}
```

Remove the now-unused `LineCategoryEntry` and `NodeContextEntry` interfaces.

**Step 3: Update DATA_DIR constant**

Change line 75:
```typescript
const DATA_DIR = 'data/spreadline/vis-author2';
```

---

### Task 3: Update service internal logic to use IDs

**Files:**
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.ts:111-408`

This is the core refactor. The internal logic currently matches by name. It needs to match by ID.

**Step 1: Update `constructEgoNetworks`**

The function filters relations by ego. Change parameter from ego name to ego ID. Update field references from `source`/`target` to `sourceId`/`targetId`:

```typescript
function constructEgoNetworks(data: RelationRow[], egoId: string): RelationRow[] {
  // ... same BFS logic but using:
  // row.sourceId / row.targetId instead of row.source / row.target
  // egoId instead of ego
}
```

**Step 2: Update `constructAuthorNetwork`**

Change signature to accept `egoId` and the entity rows (which now have `id` field). Key changes:
- Filter ego entries by `e.id === egoId` instead of `e.name === ego`
- Use `row.sourceId` / `row.targetId` instead of `row.source` / `row.target`
- Compare entities by ID throughout
- Group assignments use IDs instead of names
- Return type changes: `lineCategory` becomes `categoryMap: Record<string, LineCategoryValue>` (ID -> category)
- Topology entries use `sourceId`/`targetId`

```typescript
function constructAuthorNetwork(
  egoId: string,
  relations: RelationRow[],
  allEntities: EntityRow[]
): { topology: TopologyEntry[]; categoryMap: Record<string, LineCategoryValue>; groups: Record<string, string[][]>; network: RelationRow[] }
```

Inside the function, replace all `row.source` with `row.sourceId`, `row.target` with `row.targetId`, and entity matching by name with matching by ID.

The `getAffiliations` helper changes to:
```typescript
const getAffiliations = (entityId: string, year: string): string[] => {
  const entries = allEntities.filter(e => e.id === entityId && e.year === year);
  return [...new Set(entries.map(e => remapJHAffiliation(e.affiliation)))];
};
```

The `colorAssign` keys become entity IDs instead of names.

Group assignments use entity IDs instead of names.

The topology return becomes:
```typescript
const topology: TopologyEntry[] = network.map(row => ({
  sourceId: row.sourceId,
  targetId: row.targetId,
  time: row.year,
  weight: row.count || 1
}));
```

**Step 3: Update `getSpreadlineRawData`**

Build a name-to-ID lookup from the loaded entities CSV. Resolve ego name to ID:

```typescript
export async function getSpreadlineRawData(ego?: string): Promise<SpreadlineRawDataResponse> {
  const resolvedEgoName = ego || DEFAULT_EGO;
  const basePath = path.join(process.cwd(), DATA_DIR);

  // ... load CSVs (same as before but with new types) ...

  // Build name -> ID lookup
  const nameToId: Record<string, string> = {};
  const idToName: Record<string, string> = {};
  for (const e of allEntities) {
    if (!nameToId[e.name]) {
      nameToId[e.name] = e.id;
      idToName[e.id] = e.name;
    }
  }

  const egoId = nameToId[resolvedEgoName];
  if (!egoId) {
    throw new ORPCError('BAD_REQUEST', { message: `Ego entity "${resolvedEgoName}" not found` });
  }

  const { topology, categoryMap, groups, network } = constructAuthorNetwork(egoId, relations, allEntities);

  // Build citations per entity from citation rows
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

  // Build entities map
  const entityIds = new Set<string>();
  network.forEach(row => { entityIds.add(row.sourceId); entityIds.add(row.targetId); });

  const entities: Record<string, EntityInfo> = {};
  for (const eid of entityIds) {
    if (eid === egoId) continue; // ego excluded from entities map (no category)
    entities[eid] = {
      name: idToName[eid] || eid,
      category: categoryMap[eid] || EXTERNAL,
      citations: citationsByEntity[eid] || {}
    };
  }

  return {
    egoId,
    dataset: 'vis-author2',
    entities,
    topology,
    groups,
    config: {
      timeDelta: 'year',
      timeFormat: '%Y',
      squeezeSameCategory: true,
      minimize: 'wiggles'
    }
  };
}
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors (or only pre-existing ones unrelated to spreadline).

---

### Task 4: Update router Zod schema

**Files:**
- Modify: `src/features/spreadlines/server/routers.ts:10-41`

**Step 1: Replace the Zod schemas**

```typescript
const topologyEntrySchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  time: z.string(),
  weight: z.number()
});

const entityInfoSchema = z.object({
  name: z.string(),
  category: z.enum(['internal', 'external']),
  citations: z.record(z.string(), z.number())
});

const spreadlineRawDataResponseSchema = z.object({
  egoId: z.string(),
  dataset: z.string(),
  entities: z.record(z.string(), entityInfoSchema),
  topology: topologyEntrySchema.array(),
  groups: z.record(z.string(), z.array(z.array(z.string()))),
  config: z.object({
    timeDelta: z.string(),
    timeFormat: z.string(),
    squeezeSameCategory: z.boolean(),
    minimize: z.string()
  })
});
```

Remove the `lineCategoryEntrySchema` and `nodeContextEntrySchema` (no longer used).

---

### Task 5: Update unit tests

**Files:**
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.test.ts`

**Step 1: Rewrite tests for new response shape**

```typescript
/**
 * @jest-environment node
 */

jest.mock('@orpc/server', () => ({
  ORPCError: class ORPCError extends Error {
    constructor(code: string, opts?: { message?: string }) {
      super(opts?.message ?? code);
    }
  }
}));

import { getSpreadlineRawData } from './spreadline-data.service';

describe('spreadline-data.service', () => {
  describe('getSpreadlineRawData', () => {
    it('returns expected top-level fields', async () => {
      const result = await getSpreadlineRawData('Jeffrey Heer');

      expect(typeof result.egoId).toBe('string');
      expect(result.egoId).toMatch(/^p\d{4}$/);
      expect(result.dataset).toBe('vis-author2');
      expect(Array.isArray(result.topology)).toBe(true);
      expect(typeof result.entities).toBe('object');
      expect(typeof result.groups).toBe('object');
      expect(result.config).toEqual({
        timeDelta: 'year',
        timeFormat: '%Y',
        squeezeSameCategory: true,
        minimize: 'wiggles'
      });
    });

    it('returns entities map with name, category, and citations', async () => {
      const result = await getSpreadlineRawData('Jeffrey Heer');

      expect(Object.keys(result.entities).length).toBeGreaterThan(0);

      for (const [id, entity] of Object.entries(result.entities)) {
        expect(id).toMatch(/^p\d{4}$/);
        expect(typeof entity.name).toBe('string');
        expect(entity.name.length).toBeGreaterThan(0);
        expect(['internal', 'external']).toContain(entity.category);
        expect(typeof entity.citations).toBe('object');
      }
    });

    it('does not include ego entity in entities map', async () => {
      const result = await getSpreadlineRawData('Jeffrey Heer');

      expect(result.entities[result.egoId]).toBeUndefined();
    });

    it('topology entries reference valid entity IDs', async () => {
      const result = await getSpreadlineRawData('Jeffrey Heer');
      const allIds = new Set([...Object.keys(result.entities), result.egoId]);

      expect(result.topology.length).toBeGreaterThan(0);
      for (const entry of result.topology) {
        expect(entry.sourceId).toMatch(/^p\d{4}$/);
        expect(entry.targetId).toMatch(/^p\d{4}$/);
        expect(allIds.has(entry.sourceId)).toBe(true);
        expect(allIds.has(entry.targetId)).toBe(true);
      }
    });

    it('groups contain valid entity IDs', async () => {
      const result = await getSpreadlineRawData('Jeffrey Heer');
      const allIds = new Set([...Object.keys(result.entities), result.egoId]);

      for (const [year, layers] of Object.entries(result.groups)) {
        expect(year).toMatch(/^\d{4}$/);
        expect(layers).toHaveLength(5);
        for (const layer of layers) {
          for (const id of layer) {
            expect(allIds.has(id)).toBe(true);
          }
        }
      }
    });

    it('citation keys in entities are valid year strings', async () => {
      const result = await getSpreadlineRawData('Jeffrey Heer');

      for (const entity of Object.values(result.entities)) {
        for (const [time, count] of Object.entries(entity.citations)) {
          expect(time).toMatch(/^\d{4}$/);
          expect(typeof count).toBe('number');
        }
      }
    });
  });
});
```

**Step 2: Run the tests**

Run: `npm test -- --testPathPattern=spreadline-data.service.test`
Expected: All 6 tests pass.

**Step 3: Commit**

```bash
git add src/features/spreadlines/server/ src/features/spreadlines/server/services/
git commit -m "feat: refactor spreadline service and router for entity IDs"
```

---

### Task 6: Update frontend component

**Files:**
- Modify: `src/features/spreadlines/components/spreadline.component.tsx:58-111`

**Step 1: Update the `computeLayout` function**

The SpreadLine library expects:
- `load(topology, { source, target, time, weight }, 'topology')` — field names must match data keys
- `load(lineColorData, { entity, color }, 'line')` — array of `{ entity, color }` objects
- `load(nodeContextData, { time, entity, context }, 'node')` — array of `{ time, entity, context }` objects
- `center(ego, ...)` — ego as a string identifier

Since the library uses the raw field values as identifiers internally, we pass IDs. The library will work with IDs just like it worked with names. The only place names matter is for display (labels), which we handle separately.

Update the `useEffect` that computes layout:

```typescript
useEffect(() => {
  if (!rawData) return;

  async function computeLayout() {
    if (!rawData) return;
    try {
      setComputing(true);
      const startTime = performance.now();

      const spreadline = new SpreadLine();

      // Convert topology to library format (source/target keys)
      const topoData = rawData.topology.map(t => ({
        source: t.sourceId,
        target: t.targetId,
        time: t.time,
        weight: t.weight
      }));
      spreadline.load(topoData, { source: 'source', target: 'target', time: 'time', weight: 'weight' }, 'topology');

      // Convert entities map to line color array
      const lineColorData = Object.entries(rawData.entities).map(([id, entity]) => ({
        entity: id,
        color: SPREADLINE_CATEGORY_COLORS[entity.category] ?? SPREADLINE_CATEGORY_COLORS.external
      }));
      spreadline.load(lineColorData, { entity: 'entity', color: 'color' }, 'line');

      // Convert entities citations to node context array
      const nodeContextData: { entity: string; time: string; context: number }[] = [];
      for (const [id, entity] of Object.entries(rawData.entities)) {
        for (const [time, count] of Object.entries(entity.citations)) {
          nodeContextData.push({ entity: id, time, context: count });
        }
      }
      if (nodeContextData.length > 0) {
        spreadline.load(nodeContextData, { time: 'time', entity: 'entity', context: 'context' }, 'node');
      }

      spreadline.center(rawData.egoId, undefined, rawData.config.timeDelta, rawData.config.timeFormat, rawData.groups);
      spreadline.configure({
        squeezeSameCategory: rawData.config.squeezeSameCategory,
        minimize: rawData.config.minimize as 'space' | 'line' | 'wiggles'
      });

      // Calculate dynamic width based on entity names
      const allNames = new Set<string>();
      rawData.topology.forEach(t => {
        const srcName = rawData.entities[t.sourceId]?.name ?? t.sourceId;
        const tgtName = rawData.entities[t.targetId]?.name ?? t.targetId;
        allNames.add(srcName);
        allNames.add(tgtName);
      });
      const longestName = Math.max(...Array.from(allNames).map(n => n.length));
      const labelWidth = longestName * 8 + 80;
      const numTimestamps = new Set(rawData.topology.map(t => t.time)).size;
      const minWidthPerTimestamp = Math.max(SPREADLINE_MIN_WIDTH_PER_TIMESTAMP, labelWidth);
      const dynamicWidth = numTimestamps * minWidthPerTimestamp;

      const result = spreadline.fit(dynamicWidth, SPREADLINE_CHART_HEIGHT);
      setComputeTime(performance.now() - startTime);
      setComputedData({ ...result, mode: 'author', reference: [] } as SpreadLineData);
    } catch (err) {
      console.error('SpreadLine layout error:', err);
      setComputeError(err instanceof Error ? err.message : 'Layout computation failed');
    } finally {
      setComputing(false);
    }
  }

  computeLayout();
}, [rawData]);
```

Note: The SpreadLine library will now use entity IDs as internal identifiers. If the library renders labels from these identifiers, the labels will show IDs (e.g., "p0042") instead of names. This is expected — label rendering can be enhanced in a follow-up to use the entities map for display names.

**Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/spreadline.component.tsx
git commit -m "feat: update spreadline component for entity ID response"
```

---

### Task 7: Final verification

**Step 1: Run all tests**

Run: `npm test -- --testPathPattern=spreadline`
Expected: All tests pass.

**Step 2: Run full build**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: spreadline entity IDs — CSV generation, service refactor, frontend update"
```
