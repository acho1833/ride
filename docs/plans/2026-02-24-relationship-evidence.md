# Relationship Evidence (.re) Tab — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When user double-clicks a link in the spreadline graph, open a virtual `.re` tab showing all relationship events between the two authors in a filterable, paginated table.

**Architecture:** New API endpoint reads relations CSV filtered by author pair. New `.re` file extension route in the editor renders a Shadcn Table + TanStack React Table v8 component with per-column filters and client-side pagination. Double-click handler on graph links triggers tab opening via `openNewFile`.

**Tech Stack:** TanStack React Table v8, Shadcn Table component, ORPC endpoint, PapaParse CSV reading

---

### Task 1: Install dependencies

**Step 1: Install TanStack React Table**

Run: `npm install @tanstack/react-table`

**Step 2: Install Shadcn Table component**

Run: `npx shadcn@latest add table`

**Step 3: Verify installation**

Run: `ls src/components/ui/table.tsx && cat package.json | grep react-table`
Expected: File exists and `@tanstack/react-table` in dependencies

**Step 4: Commit**

```bash
git add package.json package-lock.json src/components/ui/table.tsx
git commit -m "chore: add @tanstack/react-table and shadcn table component"
```

---

### Task 2: Create RelationEvent model

**Files:**
- Create: `src/models/relation-event.model.ts`

**Step 1: Create the model file**

```typescript
// src/models/relation-event.model.ts
import { z } from 'zod';

export interface RelationEvent {
  id: string;
  year: string;
  sourceId: string;
  targetId: string;
  type: string;
  citationCount: number;
}

export const relationEventSchema = z.object({
  id: z.string(),
  year: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string(),
  citationCount: z.number()
});
```

**Step 2: Commit**

```bash
git add src/models/relation-event.model.ts
git commit -m "feat(re): add RelationEvent model and Zod schema"
```

---

### Task 3: Create relation-event service

**Files:**
- Create: `src/features/spreadlines/server/services/relation-event.service.ts`

**Context:** Reuse the `loadCSV` pattern and `RelationRow` type from `spreadline-data.service.ts`. The existing service at `src/features/spreadlines/server/services/spreadline-data.service.ts` already has `loadCSV<T>()` helper (line 76-84) and `RelationRow` interface (line 10-18), but they're private to that file. Duplicate the minimal needed parts rather than refactoring the existing service.

**Step 1: Create the service**

```typescript
// src/features/spreadlines/server/services/relation-event.service.ts
import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import type { RelationEvent } from '@/models/relation-event.model';

const MAX_RELATION_EVENTS = 500;

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
  const relations = await loadCSV<RelationRow>(path.join(basePath, 'relations.csv'));

  const filtered = relations.filter(
    r =>
      (r.sourceId === sourceId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === sourceId)
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
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/server/services/relation-event.service.ts
git commit -m "feat(re): add relation-event service for CSV filtering"
```

---

### Task 4: Add API endpoint to spreadline router

**Files:**
- Modify: `src/features/spreadlines/server/routers.ts`

**Step 1: Add the endpoint**

Import the service and add a new `getRelationEvents` route to the `spreadlineRouter`. Add the `relationEventSchema` import and a new route after the existing `getRawData` route.

Add to imports:
```typescript
import { relationEventSchema } from '@/models/relation-event.model';
import * as relationEventService from './services/relation-event.service';
```

Add new route inside `spreadlineRouter`:
```typescript
getRelationEvents: appProcedure
  .route({
    method: 'GET',
    path: `${API_SPREADLINE_PREFIX}/relation-events`,
    summary: 'Get relation events between two entities',
    tags
  })
  .input(z.object({ sourceId: z.string(), targetId: z.string() }))
  .output(relationEventSchema.array())
  .handler(async ({ input }) => {
    return relationEventService.getRelationEvents(input.sourceId, input.targetId);
  })
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/features/spreadlines/server/routers.ts
git commit -m "feat(re): add relation-events API endpoint"
```

---

### Task 5: Create React Query hook

**Files:**
- Create: `src/features/spreadlines/hooks/useRelationEventsQuery.ts`

**Step 1: Create the hook**

```typescript
// src/features/spreadlines/hooks/useRelationEventsQuery.ts
import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useRelationEventsQuery = (sourceId: string, targetId: string) => {
  return useQuery(
    orpc.spreadline.getRelationEvents.queryOptions({
      input: { sourceId, targetId }
    })
  );
};
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/hooks/useRelationEventsQuery.ts
git commit -m "feat(re): add useRelationEventsQuery hook"
```

---

### Task 6: Create relationship-evidence constants

**Files:**
- Create: `src/features/relationship-evidence/const.ts`

**Step 1: Create the constants file**

```typescript
// src/features/relationship-evidence/const.ts

/** Maximum number of relation events returned from API */
export const MAX_RELATION_EVENTS = 500;

/** Rows per page in the relationship evidence table */
export const RE_PAGE_SIZE = 25;
```

**Step 2: Commit**

```bash
git add src/features/relationship-evidence/const.ts
git commit -m "feat(re): add relationship-evidence constants"
```

---

### Task 7: Add double-click handler on graph links

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`
- Modify: `src/features/spreadlines/components/spreadline-tab.component.tsx`

**Context:**
- `SpreadlineGraphComponent` at `src/features/spreadlines/components/spreadline-graph.component.tsx`
  - Props interface at line 149-160
  - `linkEnter` created at line 395-400
  - `linkMerged` created at line 405
- `SpreadlineTabComponent` at `src/features/spreadlines/components/spreadline-tab.component.tsx`
  - Renders `SpreadlineGraphComponent` at line 103-108

**Step 1: Add `onLinkDoubleClick` prop to SpreadlineGraphComponent**

In `Props` interface (line 149-160), add:
```typescript
onLinkDoubleClick?: (sourceId: string, targetId: string, sourceName: string, targetName: string) => void;
```

Update the component destructure (line 162) to include `onLinkDoubleClick`.

Store callback in a ref to avoid stale closures in D3:
```typescript
const onLinkDoubleClickRef = useRef(onLinkDoubleClick);
onLinkDoubleClickRef.current = onLinkDoubleClick;
```

**Step 2: Add dblclick handler on linkMerged**

After `linkMerged` is created (line 405), and after the returning links code (line 412-422), add:

```typescript
// Double-click on link: open relationship evidence tab
linkMerged
  .style('cursor', 'pointer')
  .on('dblclick', function (event: MouseEvent, d: SpreadlineGraphLink) {
    event.preventDefault();
    event.stopPropagation();
    const source = d.source as SpreadlineGraphNode;
    const target = d.target as SpreadlineGraphNode;
    onLinkDoubleClickRef.current?.(source.id, target.id, source.name, target.name);
  });
```

**Step 3: Handle callback in SpreadlineTabComponent**

In `spreadline-tab.component.tsx`, import `useOpenFilesActions`:
```typescript
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
```

Add inside the component:
```typescript
const { openNewFile } = useOpenFilesActions();
```

Add callback:
```typescript
const handleLinkDoubleClick = useCallback(
  (sourceId: string, targetId: string, sourceName: string, targetName: string) => {
    const getLastName = (name: string) => name.split(' ').pop() ?? name;
    const sortedIds = [sourceId, targetId].sort();
    const timeStart = selectedTimes.length > 0 ? selectedTimes[selectedTimes.length - 1] : '';
    const timeEnd = selectedTimes.length > 0 ? selectedTimes[0] : '';
    openNewFile({
      id: `re-${sortedIds[0]}-${sortedIds[1]}`,
      name: `${getLastName(sourceName)} ↔ ${getLastName(targetName)}.re`,
      metadata: { sourceId, targetId, sourceName, targetName, timeStart, timeEnd }
    });
  },
  [openNewFile, selectedTimes]
);
```

Pass to graph component:
```typescript
<SpreadlineGraphComponent
  rawData={rawData ?? null}
  selectedTimes={selectedTimes}
  pinnedEntityNames={pinnedEntityNames}
  filteredEntityNames={filteredEntityNames}
  onLinkDoubleClick={handleLinkDoubleClick}
/>
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx src/features/spreadlines/components/spreadline-tab.component.tsx
git commit -m "feat(re): add double-click on graph links to open .re tab"
```

---

### Task 8: Add `.re` extension routing in editor

**Files:**
- Modify: `src/features/editor/components/editor-content.component.tsx`
- Modify: `src/features/editor/components/editor-group.component.tsx`

**Step 1: Add import and case in editor-content**

In `editor-content.component.tsx`, add import:
```typescript
import RelationshipEvidenceComponent from '@/features/relationship-evidence/components/relationship-evidence.component';
```

Add new case before `default` in the switch (after `case 'txt':` at line 54-55):
```typescript
case 're':
  return <RelationshipEvidenceComponent metadata={metadata} />;
```

**Step 2: Ensure `.re` tabs get ScrollArea (not full-height)**

In `editor-group.component.tsx` at line 51, the `isFullHeight` check should NOT include `.re` since it's a table that needs scrolling. No change needed — `.re` is not in the list, so it will default to having ScrollArea. Verify this is correct.

**Step 3: Commit** (defer until Task 9 creates the component, to avoid import errors)

---

### Task 9: Create RelationshipEvidenceComponent

**Files:**
- Create: `src/features/relationship-evidence/components/relationship-evidence.component.tsx`
- Create: `src/features/relationship-evidence/utils.ts`

**Context:** This component uses:
- `useRelationEventsQuery` hook from Task 5
- Shadcn `Table` component (installed in Task 1)
- TanStack React Table v8 (installed in Task 1)
- Constants from Task 6

**Step 1: Create utils file with column definitions**

```typescript
// src/features/relationship-evidence/utils.ts
import { createColumnHelper } from '@tanstack/react-table';
import type { RelationEvent } from '@/models/relation-event.model';

const columnHelper = createColumnHelper<RelationEvent>();

export const columns = [
  columnHelper.accessor('year', {
    header: 'Year',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  }),
  columnHelper.accessor('id', {
    header: 'Paper ID',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  }),
  columnHelper.accessor('citationCount', {
    header: 'Citations',
    cell: info => info.getValue(),
    filterFn: 'includesString'
  })
];

/** Year range filter: keeps rows where year is between min and max (inclusive, string comparison) */
export function yearRangeFilterFn(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: [string, string]
): boolean {
  const year = String(row.getValue(columnId));
  const [min, max] = filterValue;
  if (min && year < min) return false;
  if (max && year > max) return false;
  return true;
}
```

**Step 2: Create the main component**

```typescript
// src/features/relationship-evidence/components/relationship-evidence.component.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnFiltersState,
  type SortingState
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRelationEventsQuery } from '@/features/spreadlines/hooks/useRelationEventsQuery';
import { columns, yearRangeFilterFn } from '@/features/relationship-evidence/utils';
import { RE_PAGE_SIZE } from '@/features/relationship-evidence/const';

interface Props {
  metadata?: Record<string, string>;
}

const RelationshipEvidenceComponent = ({ metadata }: Props) => {
  const sourceId = metadata?.sourceId ?? '';
  const targetId = metadata?.targetId ?? '';
  const sourceName = metadata?.sourceName ?? sourceId;
  const targetName = metadata?.targetName ?? targetId;
  const timeStart = metadata?.timeStart ?? '';
  const timeEnd = metadata?.timeEnd ?? '';

  const { data: events = [], isPending } = useRelationEventsQuery(sourceId, targetId);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'year', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    // Pre-populate year range from spreadline time range
    if (timeStart || timeEnd) {
      return [{ id: 'year', value: [timeEnd, timeStart] }];
    }
    return [];
  });

  const columnsWithYearRange = useMemo(
    () =>
      columns.map(col => {
        if ('accessorKey' in col && col.accessorKey === 'year') {
          return { ...col, filterFn: yearRangeFilterFn };
        }
        return col;
      }),
    []
  );

  const table = useReactTable({
    data: events,
    columns: columnsWithYearRange,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: RE_PAGE_SIZE } }
  });

  if (!sourceId || !targetId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Missing author IDs in file metadata</div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-muted-foreground text-sm">Loading relationship events...</div>
        </div>
      </div>
    );
  }

  const yearFilter = (table.getColumn('year')?.getFilterValue() as [string, string]) ?? ['', ''];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">
          {sourceName} ↔ {targetName}
        </h2>
        <p className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} of {events.length} events
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-1">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Year From</label>
            <Input
              className="h-8 w-28 text-sm"
              placeholder="YYYY-MM"
              value={yearFilter[0]}
              onChange={e => table.getColumn('year')?.setFilterValue([e.target.value, yearFilter[1]])}
            />
          </div>
          <span className="text-muted-foreground pb-1">–</span>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">Year To</label>
            <Input
              className="h-8 w-28 text-sm"
              placeholder="YYYY-MM"
              value={yearFilter[1]}
              onChange={e => table.getColumn('year')?.setFilterValue([yearFilter[0], e.target.value])}
            />
          </div>
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Paper ID</label>
          <Input
            className="h-8 w-36 text-sm"
            placeholder="Filter..."
            value={(table.getColumn('id')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('id')?.setFilterValue(e.target.value)}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Type</label>
          <Input
            className="h-8 w-36 text-sm"
            placeholder="Filter..."
            value={(table.getColumn('type')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('type')?.setFilterValue(e.target.value)}
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs">Citations</label>
          <Input
            className="h-8 w-28 text-sm"
            placeholder="Filter..."
            value={(table.getColumn('citationCount')?.getFilterValue() as string) ?? ''}
            onChange={e => table.getColumn('citationCount')?.setFilterValue(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RelationshipEvidenceComponent;
```

**Step 3: Add `.re` routing in editor-content.component.tsx**

Add import at top:
```typescript
import RelationshipEvidenceComponent from '@/features/relationship-evidence/components/relationship-evidence.component';
```

Add case before `default`:
```typescript
case 're':
  return <RelationshipEvidenceComponent metadata={metadata} />;
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 5: Verify dev server**

Run: `npm run dev` and navigate to a spreadline tab, double-click a link

**Step 6: Commit**

```bash
git add src/features/relationship-evidence/ src/features/editor/components/editor-content.component.tsx
git commit -m "feat(re): add RelationshipEvidenceComponent with filterable table"
```

---

### Task 10: Build and lint check

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Fix any issues found**

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix(re): address lint/build issues"
```
