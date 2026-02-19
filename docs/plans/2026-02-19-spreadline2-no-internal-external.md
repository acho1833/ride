# Spreadline 2 (No Internal/External) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a separate "Spreadline 2" feature (`.sl2` extension) that renders spreadline visualizations without internal/external entity distinction — all entities stack above ego with a single line color.

**Architecture:** Full copy of the existing `spreadlines` feature into a new `spreadline2` feature. The data service removes affiliation-based internal/external logic, placing all 1-hop entities above ego (group index 1) and all 2-hop entities at top (group index 0). Groups 3 and 4 are always empty. All non-ego lines use orange (#FA9902). Reuses the existing `src/lib/spreadline` core library unchanged.

**Tech Stack:** Next.js, TypeScript, ORPC, D3.js, Papa CSV parsing, Zustand

---

## Task 1: Copy CSV Data

**Files:**
- Create: `data/spreadline/vis-author-no-internal/entities.csv`
- Create: `data/spreadline/vis-author-no-internal/relations.csv`
- Create: `data/spreadline/vis-author-no-internal/citations.csv`

**Step 1:** Copy all three CSV files from `data/spreadline/vis-author2/` to `data/spreadline/vis-author-no-internal/`

```bash
cp -r data/spreadline/vis-author2/ data/spreadline/vis-author-no-internal/
```

**Step 2:** Verify files exist

```bash
ls data/spreadline/vis-author-no-internal/
```

Expected: `citations.csv  entities.csv  relations.csv`

---

## Task 2: Create Data Service (Key Change)

**Files:**
- Create: `src/features/spreadline2/server/services/spreadline2-data.service.ts`

**Step 1:** Copy from `src/features/spreadlines/server/services/spreadline-data.service.ts` with these modifications:

1. Change `DATASET_NAME` to `'vis-author-no-internal'`
2. Change `LineCategoryValue` to `'collaborator'` only (remove `'internal' | 'external'`)
3. Remove `remapJHAffiliation` function entirely
4. Simplify `constructAuthorNetwork` to remove all affiliation comparison logic:
   - All entities directly connected to ego → group index 1 (1-hop, above ego)
   - All 2-hop entities → group index 0 (top, collapsible)
   - Groups 3 and 4 are always empty arrays
   - All entities get category `'collaborator'`
5. Remove `INTERNAL`/`EXTERNAL` constants, replace with single `COLLABORATOR = 'collaborator'`

The key difference in `constructAuthorNetwork`:
```typescript
// BEFORE (spreadline): affiliation comparison determines internal vs external
const egoAffiliations = getAffiliations(egoId, year);
const intersection = affiliations.filter(a => egoAffiliations.includes(a));
const category = intersection.length > 0 ? INTERNAL : EXTERNAL;
if (intersection.length > 0) {
  groupAssign[year][3].add(firstAuthor);  // internal 1-hop
} else {
  groupAssign[year][1].add(firstAuthor);  // external 1-hop
}

// AFTER (spreadline2): no affiliation, all go to same groups
if (author === egoId) {
  groupAssign[year][1].add(firstAuthor);  // 1-hop (above ego)
  colorAssign[year][firstAuthor] = COLLABORATOR;
} else {
  groupAssign[year][0].add(author);       // 2-hop (top section)
  colorAssign[year][author] = COLLABORATOR;
}
```

---

## Task 3: Create Constants File

**Files:**
- Create: `src/features/spreadline2/const.ts`

**Step 1:** Copy from `src/features/spreadlines/const.ts` with these modifications:

1. Rename all constants with `SPREADLINE2_` prefix
2. Remove `SPREADLINE2_INTERNAL_COLOR` and `SPREADLINE2_EXTERNAL_COLOR`
3. Add single `SPREADLINE2_LINE_COLOR = '#FA9902'` (orange)
4. Change `SPREADLINE2_CATEGORY_COLORS` to `{ collaborator: '#FA9902' }`
5. Keep all other constants (graph, scrubber, highlight) with `SPREADLINE2_` prefix
6. Update default ego ID: `SPREADLINE2_DEFAULT_EGO_ID = 'p1199'`

---

## Task 4: Create Utils File

**Files:**
- Create: `src/features/spreadline2/utils.ts`

**Step 1:** Copy from `src/features/spreadlines/utils.ts` with these modifications:

1. Change `SpreadlineGraphNode.category` type from `'internal' | 'external' | 'ego'` to `'collaborator' | 'ego'`
2. In `transformSpreadlineToGraphByTime`: update hop map logic — groups[0] = 2-hop, groups[1] = 1-hop, groups[3] and groups[4] are always empty
3. In `transformSpreadlineToGraphByTimes`: same group mapping change
4. Default fallback category: `'collaborator'` instead of `'external'`

---

## Task 5: Create Router

**Files:**
- Create: `src/features/spreadline2/server/routers.ts`

**Step 1:** Copy from `src/features/spreadlines/server/routers.ts` with:

1. Change `API_SPREADLINE_PREFIX` to `'/spreadline2'`
2. Change `tags` to `['Spreadline2']`
3. Change `entityInfoSchema` category to `z.enum(['collaborator'])`
4. Import from `./services/spreadline2-data.service`
5. Export as `spreadline2Router`

---

## Task 6: Register Router

**Files:**
- Modify: `src/lib/orpc/router.ts`

**Step 1:** Add import and register:

```typescript
import { spreadline2Router } from '@/features/spreadline2/server/routers';

export const router = {
  // ... existing routers
  spreadline2: spreadline2Router
};
```

---

## Task 7: Create Query Hook

**Files:**
- Create: `src/features/spreadline2/hooks/useSpreadline2RawDataQuery.ts`

**Step 1:** Copy from `src/features/spreadlines/hooks/useSpreadlineRawDataQuery.ts`, point to `orpc.spreadline2.getRawData`.

---

## Task 8: Create Components

**Files:**
- Create: `src/features/spreadline2/components/spreadline2-tab.component.tsx`
- Create: `src/features/spreadline2/components/spreadline2.component.tsx`
- Create: `src/features/spreadline2/components/spreadline2-graph.component.tsx`
- Create: `src/features/spreadline2/components/spreadline2-scrubber.component.tsx`

**Step 1:** Copy each from `src/features/spreadlines/components/` equivalent. Update all imports to use:
- `@/features/spreadline2/const` (with `SPREADLINE2_*` constants)
- `@/features/spreadline2/hooks/useSpreadline2RawDataQuery`
- `@/features/spreadline2/utils`
- Internal component references (e.g., `Spreadline2GraphComponent`, `Spreadline2Component`)

**Step 2:** In `spreadline2-graph.component.tsx`, update `getNodeFill`:
```typescript
const getNodeFill = (d: Spreadline2GraphNode): string => {
  if (d.isEgo) return EGO_NODE_COLOR;
  return SPREADLINE2_LINE_COLOR;  // All non-ego are orange
};
```

---

## Task 9: Register File Extension

**Files:**
- Modify: `src/const.ts`
- Modify: `src/features/editor/components/editor-content.component.tsx`

**Step 1:** In `src/const.ts`, add to `FILE_APPLICATIONS`:
```typescript
{ id: 'spreadline2', label: 'Spreadline 2', extension: '.sl2', iconName: 'TrendingUp' }
```

**Step 2:** In `editor-content.component.tsx`, add case:
```typescript
case 'sl2':
  return <Spreadline2TabComponent fileId={fileId} fileName={fileName} />;
```

---

## Task 10: Build Verification

**Step 1:** Run lint

```bash
npm run lint
```

Expected: No new errors

**Step 2:** Run build

```bash
npm run build
```

Expected: Build succeeds

---

## Task 11: Manual Testing

**Step 1:** Start dev server and create a `.sl2` file in the file tree to verify:
- Spreadline 2 renders with all entities above ego
- All non-ego lines are orange
- 2-hop section appears at top (collapsible)
- No entities appear below ego
- Graph panel shows all nodes in orange (no internal/external color distinction)
- Time scrubber works
- Zoom/pan works

---

## Summary of Changes

| Area | Change |
|------|--------|
| Data files | Copy vis-author2 → vis-author-no-internal (identical CSVs) |
| Data service | Remove affiliation logic, single category, groups [2hop, 1hop, ego, [], []] |
| Constants | Single orange color for all entities |
| Utils | Category type simplified to 'collaborator' \| 'ego' |
| Components | Full copy with updated imports and single-color node fill |
| Router | New `/spreadline2` API endpoint |
| Editor | New `.sl2` extension routing |
| Existing code | ZERO changes to existing spreadline feature or core library |
