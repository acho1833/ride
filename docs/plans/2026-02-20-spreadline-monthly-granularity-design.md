# Spreadline Monthly Granularity + Pagination Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add monthly time granularity and block pagination to the Spreadline (v1) visualization.

**Architecture:** Generate monthly CSV data from yearly via seeded script (10-15x multiplier). Add `granularity` param to the existing API endpoint to select yearly vs monthly CSV directory. Client adds a granularity dropdown and pagination (20 blocks/page) to the SpreadLine chart's zoom panel. Pagination resets the highlight bar to the first block of each new page.

**Tech Stack:** TypeScript, papaparse, @faker-js/faker (seeded), React, Shadcn Select, ORPC, Zod

---

## Task 1: Add Constants for Granularity and Pagination

**Files:**
- Modify: `src/features/spreadlines/const.ts`

**Step 1: Add granularity type, options, page size, and monthly time config constants**

Add after the existing `SPREADLINE_TIME_FORMAT` constant (line 42):

```typescript
/** Granularity type for time axis */
export type SpreadlineGranularity = 'yearly' | 'monthly';

/** Available granularity options for the dropdown */
export const SPREADLINE_GRANULARITY_OPTIONS: { label: string; value: SpreadlineGranularity }[] = [
  { label: 'Yearly', value: 'yearly' },
  { label: 'Monthly', value: 'monthly' }
];

/** Default granularity */
export const SPREADLINE_DEFAULT_GRANULARITY: SpreadlineGranularity = 'yearly';

/** Number of blocks per page for pagination */
export const SPREADLINE_PAGE_SIZE = 20;

/** Time config per granularity */
export const SPREADLINE_TIME_CONFIG: Record<SpreadlineGranularity, { delta: string; format: string }> = {
  yearly: { delta: 'year', format: '%Y' },
  monthly: { delta: 'month', format: '%Y-%m' }
};
```

**Step 2: Run lint to verify**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/spreadlines/const.ts
git commit -m "feat: add granularity and pagination constants for spreadline"
```

---

## Task 2: Create Monthly CSV Generation Script

**Files:**
- Create: `scripts/generate-monthly-data.ts`
- Modify: `package.json` (add npm script)

**Step 1: Create the generation script**

Create `scripts/generate-monthly-data.ts`:

```typescript
/**
 * Generate monthly spreadline data from yearly vis-author2 CSVs.
 *
 * Strategy:
 * 1. Read yearly relations, entities, citations from data/spreadline/vis-author2/
 * 2. For each relation, assign it to a random month within its year (grouped by paper ID)
 * 3. Generate 10-15x synthetic additional relations to fill months densely
 * 4. Output to data/spreadline/vis-author2-monthly/
 *
 * Uses seeded faker for reproducibility.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import pkg from 'papaparse';
import { faker } from '@faker-js/faker';

const { parse, unparse } = pkg;

// ── Configuration ────────────────────────────────────────────────────
const SEED = 42;
const MULTIPLIER = 12; // ~12x synthetic data per original relation
const SRC = 'data/spreadline/vis-author2';
const DST = 'data/spreadline/vis-author2-monthly';

// ── Helpers ──────────────────────────────────────────────────────────

faker.seed(SEED);

function loadCSV<T>(file: string): T[] {
  return parse<T>(readFileSync(`${SRC}/${file}`, 'utf-8'), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  }).data;
}

function padMonth(m: number): string {
  return String(m).padStart(2, '0');
}

function randomMonth(): number {
  return faker.number.int({ min: 1, max: 12 });
}

function generatePaperId(): string {
  return `syn_${faker.string.alphanumeric(24)}`;
}

// ── Main ─────────────────────────────────────────────────────────────

interface RelationRow {
  year: number | string;
  sourceId: string;
  targetId: string;
  id: string;
  type: string;
  citationcount: number;
  count: number;
}

interface EntityRow {
  id: string;
  name: string;
  year: number | string;
  citationcount: number;
  affiliation: string;
}

interface CitationRow {
  entityId: string;
  year: number | string;
  citationcount: number;
  affiliation: string;
  paperID: string;
}

const relations = loadCSV<RelationRow>('relations.csv');
const entities = loadCSV<EntityRow>('entities.csv');
const citations = loadCSV<CitationRow>('citations.csv');

// Step 1: Assign each paper to a random month (seeded)
const paperMonthMap = new Map<string, number>();
for (const r of relations) {
  if (!paperMonthMap.has(r.id)) {
    paperMonthMap.set(r.id, randomMonth());
  }
}

// Step 2: Convert original relations to monthly
const monthlyRelations: RelationRow[] = [];
for (const r of relations) {
  const month = paperMonthMap.get(r.id)!;
  monthlyRelations.push({
    ...r,
    year: `${r.year}-${padMonth(month)}`
  });
}

// Step 3: Generate synthetic relations (MULTIPLIER x)
// Group original relations by year to get entity pairs per year
const relationsByYear = new Map<number, RelationRow[]>();
for (const r of relations) {
  const year = Number(r.year);
  if (!relationsByYear.has(year)) relationsByYear.set(year, []);
  relationsByYear.get(year)!.push(r);
}

for (const [year, yearRelations] of relationsByYear) {
  // Get unique entity pairs from this year
  const pairs = new Map<string, { sourceId: string; targetId: string; type: string }>();
  for (const r of yearRelations) {
    const key = `${r.sourceId}::${r.targetId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { sourceId: r.sourceId, targetId: r.targetId, type: r.type });
    }
  }

  // For each pair, generate MULTIPLIER synthetic entries across random months
  for (const pair of pairs.values()) {
    for (let i = 0; i < MULTIPLIER; i++) {
      const month = randomMonth();
      const paperId = generatePaperId();
      const citCount = faker.number.int({ min: 0, max: 200 });
      monthlyRelations.push({
        year: `${year}-${padMonth(month)}`,
        sourceId: pair.sourceId,
        targetId: pair.targetId,
        id: paperId,
        type: pair.type,
        citationcount: citCount,
        count: 1
      });
    }
  }
}

// Step 4: Convert entities to monthly (duplicate for each month their papers appear)
const entityMonths = new Map<string, Set<string>>(); // entityId -> set of YYYY-MM
for (const r of monthlyRelations) {
  const ym = String(r.year);
  if (!entityMonths.has(r.sourceId)) entityMonths.set(r.sourceId, new Set());
  if (!entityMonths.has(r.targetId)) entityMonths.set(r.targetId, new Set());
  entityMonths.get(r.sourceId)!.add(ym);
  entityMonths.get(r.targetId)!.add(ym);
}

// Build entity lookup by id
const entityById = new Map<string, EntityRow>();
for (const e of entities) {
  if (!entityById.has(e.id)) entityById.set(e.id, e);
}

const monthlyEntities: EntityRow[] = [];
for (const [entityId, months] of entityMonths) {
  const base = entityById.get(entityId);
  if (!base) continue;
  for (const ym of months) {
    monthlyEntities.push({
      ...base,
      year: ym
    });
  }
}

// Step 5: Convert citations to monthly
const monthlyCitations: CitationRow[] = [];
// Original citations mapped to monthly
for (const c of citations) {
  const paperId = String(c.paperID);
  const month = paperMonthMap.get(paperId);
  if (month !== undefined) {
    monthlyCitations.push({
      ...c,
      year: `${c.year}-${padMonth(month)}`
    });
  }
}

// Synthetic citation entries for synthetic papers
for (const r of monthlyRelations) {
  if (String(r.id).startsWith('syn_')) {
    const entity = entityById.get(r.sourceId) || entityById.get(r.targetId);
    monthlyCitations.push({
      entityId: r.sourceId,
      year: String(r.year),
      citationcount: r.citationcount,
      affiliation: entity?.affiliation ?? '',
      paperID: r.id
    });
  }
}

// Step 6: Write output
mkdirSync(DST, { recursive: true });
writeFileSync(`${DST}/relations.csv`, unparse(monthlyRelations));
writeFileSync(`${DST}/entities.csv`, unparse(monthlyEntities));
writeFileSync(`${DST}/citations.csv`, unparse(monthlyCitations));

const uniqueMonths = new Set(monthlyRelations.map(r => String(r.year)));
console.log(`Generated monthly data:`);
console.log(`  Relations: ${monthlyRelations.length} (from ${relations.length} yearly)`);
console.log(`  Entities:  ${monthlyEntities.length} (from ${entities.length} yearly)`);
console.log(`  Citations: ${monthlyCitations.length} (from ${citations.length} yearly)`);
console.log(`  Unique months: ${uniqueMonths.size}`);
console.log(`  Output: ${DST}/`);
```

**Step 2: Add npm script to package.json**

Add to `scripts` section in `package.json`:

```json
"generate:spreadline-monthly": "tsx scripts/generate-monthly-data.ts"
```

**Step 3: Run the script to generate data**

Run: `npm run generate:spreadline-monthly`
Expected: Output showing ~10-15x data generation with hundreds of unique months

**Step 4: Verify generated CSVs exist and have content**

Run: `head -5 data/spreadline/vis-author2-monthly/relations.csv`
Expected: CSV with `year` column containing `YYYY-MM` format values

**Step 5: Commit**

```bash
git add scripts/generate-monthly-data.ts package.json data/spreadline/vis-author2-monthly/
git commit -m "feat: add monthly data generation script and generated CSVs"
```

---

## Task 3: Update Server Data Service for Granularity

**Files:**
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.ts`
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.test.ts`

**Step 1: Update the service to accept granularity parameter**

In `spreadline-data.service.ts`:

1. Change the `DATA_DIR` constant and add a directory mapping (around line 66-67):

```typescript
const DATASET_DIRS: Record<string, string> = {
  yearly: 'data/spreadline/vis-author2',
  monthly: 'data/spreadline/vis-author2-monthly'
};
```

2. Update `getSpreadlineRawData` params type (line 342-346) to include `granularity`:

```typescript
export async function getSpreadlineRawData(params: {
  egoId: string;
  relationTypes: string[];
  yearRange: [number, number];
  granularity?: 'yearly' | 'monthly';
}): Promise<SpreadlineRawDataResponse> {
  const { egoId, relationTypes, yearRange, granularity = 'yearly' } = params;
  const dataDir = DATASET_DIRS[granularity] ?? DATASET_DIRS.yearly;
  const basePath = path.join(process.cwd(), dataDir);
```

3. Update the year range filter (line 367-370) to handle `YYYY-MM` format:

```typescript
  // Filter relations by type and year range
  relations = relations.filter(r => {
    const yearStr = String(r.year);
    const year = Number(yearStr.substring(0, 4)); // Works for both "2010" and "2010-03"
    return relationTypes.includes(r.type) && year >= yearRange[0] && year <= yearRange[1];
  });
```

4. Update the dataset name in the response to reflect granularity:

```typescript
  return {
    egoId,
    egoName: idToName[egoId],
    dataset: granularity === 'monthly' ? 'vis-author2-monthly' : DATASET_NAME,
    entities,
    topology,
    groups
  };
```

**Step 2: Update existing tests and add granularity test**

In `spreadline-data.service.test.ts`, add a test for monthly granularity:

```typescript
    it('returns monthly data when granularity is monthly', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022],
        granularity: 'monthly'
      });

      expect(result.dataset).toBe('vis-author2-monthly');
      expect(result.topology.length).toBeGreaterThan(0);

      // Monthly topology times should be in YYYY-MM format
      for (const entry of result.topology) {
        expect(entry.time).toMatch(/^\d{4}-\d{2}$/);
      }
    });
```

Also update the groups test to accept both `YYYY` and `YYYY-MM` formats (line 86):

```typescript
        expect(year).toMatch(/^\d{4}(-\d{2})?$/);
```

**Step 3: Run tests**

Run: `npm test -- --testPathPattern spreadline-data.service`
Expected: All tests pass including the new monthly test

**Step 4: Commit**

```bash
git add src/features/spreadlines/server/services/spreadline-data.service.ts src/features/spreadlines/server/services/spreadline-data.service.test.ts
git commit -m "feat: support granularity param in spreadline data service"
```

---

## Task 4: Update Router and Hook for Granularity

**Files:**
- Modify: `src/features/spreadlines/server/routers.ts`
- Modify: `src/features/spreadlines/hooks/useSpreadlineRawDataQuery.ts`

**Step 1: Add granularity to the router input schema**

In `routers.ts`, update the `.input()` call (line 40-45):

```typescript
    .input(
      z.object({
        egoId: z.string(),
        relationTypes: z.array(z.string()),
        yearRange: z.tuple([z.number(), z.number()]),
        granularity: z.enum(['yearly', 'monthly']).default('yearly')
      })
    )
```

**Step 2: Update the query hook to accept granularity**

In `useSpreadlineRawDataQuery.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import type { SpreadlineGranularity } from '@/features/spreadlines/const';

export const useSpreadlineRawDataQuery = (params: {
  egoId: string;
  relationTypes: string[];
  yearRange: [number, number];
  granularity?: SpreadlineGranularity;
}) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: params }));
};
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/spreadlines/server/routers.ts src/features/spreadlines/hooks/useSpreadlineRawDataQuery.ts
git commit -m "feat: add granularity to spreadline router and query hook"
```

---

## Task 5: Add Pagination Utility to utils.ts

**Files:**
- Modify: `src/features/spreadlines/utils.ts`

**Step 1: Add pagination helper function**

Add at the end of `utils.ts`:

```typescript
/**
 * Compute a page window of time blocks.
 *
 * Time blocks are sorted descending (newest first).
 * Page 0 = last page = most recent blocks.
 * Returns the slice of blocks for the given page.
 */
export function getPagedTimeBlocks(
  allBlocks: string[],
  pageSize: number,
  pageIndex: number
): { blocks: string[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(allBlocks.length / pageSize));
  // Clamp pageIndex
  const clampedPage = Math.max(0, Math.min(pageIndex, totalPages - 1));
  // Page 0 = most recent = last slice
  // We reverse the page direction: page 0 = end of array
  const reversedPage = totalPages - 1 - clampedPage;
  const start = reversedPage * pageSize;
  const end = Math.min(start + pageSize, allBlocks.length);
  return { blocks: allBlocks.slice(start, end), totalPages };
}
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/spreadlines/utils.ts
git commit -m "feat: add getPagedTimeBlocks pagination utility"
```

---

## Task 6: Update SpreadlineTabComponent with Granularity and Pagination State

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-tab.component.tsx`

**Step 1: Add granularity and pagination state, pass to children**

Full replacement of `spreadline-tab.component.tsx`:

```tsx
'use client';

/**
 * Spreadline Tab Component
 *
 * Editor tab for .sl files. Shows D3 force graph on top
 * and SpreadLine chart on bottom in a resizable split layout.
 * Manages selectedRange, granularity, and pagination state.
 *
 * Range state: [startIndex, endIndex] into visibleTimeBlocks, or null = ALL mode.
 */

import { useState, useMemo, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import {
  SPREADLINE_DEFAULT_EGO_ID,
  SPREADLINE_DEFAULT_RELATION_TYPES,
  SPREADLINE_DEFAULT_YEAR_RANGE,
  SPREADLINE_DEFAULT_GRANULARITY,
  SPREADLINE_PAGE_SIZE,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';
import { getTimeBlocks, getPagedTimeBlocks } from '@/features/spreadlines/utils';
import SpreadlineGraphComponent from './spreadline-graph.component';
import SpreadlineComponent from './spreadline.component';

interface Props {
  fileId: string;
  fileName: string;
}

const SpreadlineTabComponent = (_props: Props) => {
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>([0, 0]);
  const [pinnedEntityNames, setPinnedEntityNames] = useState<string[]>([]);
  const [relationTypes, setRelationTypes] = useState<string[]>(SPREADLINE_DEFAULT_RELATION_TYPES);
  const [granularity, setGranularity] = useState<SpreadlineGranularity>(SPREADLINE_DEFAULT_GRANULARITY);
  const [pageIndex, setPageIndex] = useState(0); // 0 = most recent page

  const { data: rawData } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE,
    granularity
  });

  // All time blocks from raw data (sorted descending = newest first)
  const allTimeBlocks = useMemo(() => (rawData ? getTimeBlocks(rawData) : []), [rawData]);

  // Paged time blocks for the current page
  const { blocks: visibleTimeBlocks, totalPages } = useMemo(
    () => getPagedTimeBlocks(allTimeBlocks, SPREADLINE_PAGE_SIZE, pageIndex),
    [allTimeBlocks, pageIndex]
  );

  // Derive selected time strings from range indices into visible blocks
  const selectedTimes = useMemo(
    () => (selectedRange ? visibleTimeBlocks.slice(selectedRange[0], selectedRange[1] + 1) : []),
    [selectedRange, visibleTimeBlocks]
  );

  // Handle granularity change: reset pagination and highlight
  const handleGranularityChange = useCallback((newGranularity: SpreadlineGranularity) => {
    setGranularity(newGranularity);
    setPageIndex(0); // Reset to most recent page
    setSelectedRange([0, 0]); // Reset highlight to first block
  }, []);

  // Handle page change: reset highlight to first block of new page
  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
    setSelectedRange([0, 0]);
  }, []);

  // Update range when highlight bar handles are dragged on spreadline chart
  const handleHighlightRangeChange = useCallback(
    (startLabel: string, endLabel: string) => {
      const startIdx = visibleTimeBlocks.indexOf(startLabel);
      const endIdx = visibleTimeBlocks.indexOf(endLabel);
      if (startIdx !== -1 && endIdx !== -1) {
        setSelectedRange([Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]);
      }
    },
    [visibleTimeBlocks]
  );

  // Expand range to include clicked time column on spreadline
  const handleTimeClick = useCallback(
    (timeLabel: string) => {
      const idx = visibleTimeBlocks.indexOf(timeLabel);
      if (idx === -1) return;

      if (!selectedRange) {
        setSelectedRange([idx, idx]);
      } else {
        const newStart = Math.min(selectedRange[0], idx);
        const newEnd = Math.max(selectedRange[1], idx);
        setSelectedRange([newStart, newEnd]);
      }
    },
    [visibleTimeBlocks, selectedRange]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Graph Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <SpreadlineGraphComponent selectedTimes={selectedTimes} pinnedEntityNames={pinnedEntityNames} relationTypes={relationTypes} granularity={granularity} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Spreadline Chart Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full overflow-hidden">
            <SpreadlineComponent
              highlightTimes={selectedTimes}
              pinnedEntityNames={pinnedEntityNames}
              relationTypes={relationTypes}
              onRelationTypesChange={setRelationTypes}
              onTimeClick={handleTimeClick}
              onHighlightRangeChange={handleHighlightRangeChange}
              onEntityPin={setPinnedEntityNames}
              granularity={granularity}
              onGranularityChange={handleGranularityChange}
              pageIndex={pageIndex}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SpreadlineTabComponent;
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: May show errors for SpreadlineGraphComponent and SpreadlineComponent not accepting new props yet - that's expected, we'll fix in next tasks.

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/spreadline-tab.component.tsx
git commit -m "feat: add granularity and pagination state to spreadline tab"
```

---

## Task 7: Update SpreadlineComponent with Granularity Dropdown and Pagination Controls

**Files:**
- Modify: `src/features/spreadlines/components/spreadline.component.tsx`

**Step 1: Update Props interface, imports, data fetching, and UI**

Key changes to `spreadline.component.tsx`:

1. **Add imports**: `ChevronLeft`, `ChevronRight` from lucide-react; `SPREADLINE_GRANULARITY_OPTIONS`, `SPREADLINE_TIME_CONFIG`, `type SpreadlineGranularity` from const

2. **Update Props interface** to accept new props:

```typescript
interface Props {
  workspaceId?: string;
  workspaceName?: string;
  highlightTimes?: string[];
  pinnedEntityNames?: string[];
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  onTimeClick?: (timeLabel: string) => void;
  onHighlightRangeChange?: (startLabel: string, endLabel: string) => void;
  onEntityPin?: (names: string[]) => void;
  granularity: SpreadlineGranularity;
  onGranularityChange: (granularity: SpreadlineGranularity) => void;
  pageIndex: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
}
```

3. **Update data fetching** to pass granularity:

```typescript
  } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE,
    granularity
  });
```

4. **Update SpreadLine layout computation** to use granularity-aware time config:

Replace the `SPREADLINE_TIME_DELTA` and `SPREADLINE_TIME_FORMAT` usage (line 130):

```typescript
        const timeConfig = SPREADLINE_TIME_CONFIG[granularity];
        spreadline.center(nameOf(rawData.egoId), undefined, timeConfig.delta, timeConfig.format, namedGroups);
```

5. **Add granularity dropdown** in the toolbar (after the relation type Select, before the Clear button):

```tsx
        <Select value={granularity} onValueChange={val => onGranularityChange(val as SpreadlineGranularity)}>
          <SelectTrigger className="h-7 w-auto gap-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPREADLINE_GRANULARITY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
```

6. **Add pagination controls** to the floating zoom panel (before the zoom buttons):

```tsx
        {/* Floating zoom controls */}
        <div className="bg-background/80 border-border absolute right-2 bottom-2 flex items-center gap-0.5 rounded-lg border px-1 py-0.5">
          {/* Pagination */}
          {totalPages > 1 && (
            <>
              <Button variant="ghost" size="icon-xs" disabled={pageIndex >= totalPages - 1} onClick={() => onPageChange(pageIndex + 1)}>
                <ChevronLeft />
              </Button>
              <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
                {pageIndex + 1}/{totalPages}
              </span>
              <Button variant="ghost" size="icon-xs" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)}>
                <ChevronRight />
              </Button>
              <div className="bg-border mx-0.5 h-4 w-px" />
            </>
          )}
          {/* Zoom */}
          <Button variant="ghost" size="icon-xs" onClick={() => chartRef.current?.zoomOut()}>
            <Minus />
          </Button>
          <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">{zoomLevel}%</span>
          <Button variant="ghost" size="icon-xs" onClick={() => chartRef.current?.zoomIn()}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => chartRef.current?.zoomToFit()}>
            <Maximize />
          </Button>
        </div>
```

Note: Pagination goes left (older = higher page index) and right (newer = lower page index). Page 0 = most recent. ChevronLeft increments pageIndex (goes to older), ChevronRight decrements (goes to newer).

7. **Remove unused constant imports**: `SPREADLINE_TIME_DELTA`, `SPREADLINE_TIME_FORMAT` (replaced by `SPREADLINE_TIME_CONFIG`)

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or warnings about SpreadlineGraphComponent which we'll handle in the next task)

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/spreadline.component.tsx
git commit -m "feat: add granularity dropdown and pagination to spreadline component"
```

---

## Task 8: Update SpreadlineGraphComponent to Accept Granularity

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add granularity prop**

The graph component needs the `granularity` prop to pass to its `useSpreadlineRawDataQuery` call. Read the file, find the Props interface and query call, and add `granularity` to both.

The query call should become:

```typescript
  const { data: rawData } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE,
    granularity
  });
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "feat: pass granularity to spreadline graph component"
```

---

## Task 9: Build and Integration Test

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual verification (dev server)**

Run: `npm run dev`
Verify:
1. Open a `.sl` file
2. See the granularity dropdown next to relationship type (default: Yearly)
3. See pagination controls in zoom panel (if > 20 blocks)
4. Switch to Monthly - chart reloads with monthly blocks, pagination shows multiple pages
5. Use left/right arrows to page through months
6. Highlight bar resets to first block on page change
7. Force graph updates to show first block's entities on page change

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: spreadline monthly granularity with pagination - complete"
```
