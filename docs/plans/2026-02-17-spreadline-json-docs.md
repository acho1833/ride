# SpreadLine JSON Docs + lineColor→lineCategory Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Move color definitions from backend to frontend by changing `lineColor` → `lineCategory` in the API response, and (2) create an HTML documentation page documenting the updated JSON schema with comments on every attribute plus improvement suggestions.

**Architecture:** Backend sends `{ entity, category }` instead of `{ entity, color }`. Frontend maps category → hex color in the component before passing to the SpreadLine library. The SpreadLine library itself is untouched — it still receives `{ entity, color }` via `load()`. Docs page is a static Next.js page in the exempt `src/app/docs/` directory.

**Tech Stack:** Next.js, TypeScript, Zod, Tailwind CSS

---

### Task 1: Add unit tests for the lineCategory refactor

**Files:**
- Create: `src/features/spreadlines/server/services/__tests__/spreadline-data.service.test.ts`

Tests verify that after the refactor, the service returns `category` ('internal'|'external') instead of `color` (hex string).

**Step 1: Write the test file**

We test `constructAuthorNetwork` indirectly via `getSpreadlineRawData()`, verifying:
- Every `lineCategory` entry has `entity` (string) and `category` ('internal' | 'external')
- No hex color strings appear in `lineCategory`
- The ego entity does not appear in `lineCategory`

**Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern=spreadline-data`
Expected: FAIL (lineCategory doesn't exist yet, still lineColor with hex colors)

---

### Task 2: Refactor backend — lineColor → lineCategory

**Files:**
- Modify: `src/features/spreadlines/server/services/spreadline-data.service.ts`
  - Change `LineColorEntry` interface: `color: string` → `category: 'internal' | 'external'`
  - Rename to `LineCategoryEntry`
  - Update `constructAuthorNetwork` to assign category strings instead of hex colors
  - Update return type: `lineColor` → `lineCategory`
  - Remove `INTERNAL_COLOR` and `EXTERNAL_COLOR` constants
- Modify: `src/features/spreadlines/server/routers.ts`
  - Update Zod schema: `lineColorEntrySchema` → `lineCategoryEntrySchema` with `category` field
  - Update response schema: `lineColor` → `lineCategory`

**Step 1: Update the service**

**Step 2: Update the router schema**

**Step 3: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=spreadline-data`
Expected: PASS

---

### Task 3: Update frontend — map category to color

**Files:**
- Modify: `src/features/spreadlines/const.ts` — add color constants
- Modify: `src/features/spreadlines/components/spreadline.component.tsx` — map category → color before `spreadline.load()`

**Step 1: Add color constants to const.ts**

```typescript
export const SPREADLINE_INTERNAL_COLOR = '#FA9902';
export const SPREADLINE_EXTERNAL_COLOR = '#166b6b';
```

**Step 2: Update component to map category → color**

In `spreadline.component.tsx`, after `rawData` is received, map `lineCategory` to `lineColor` format before calling `spreadline.load()`:

```typescript
const lineColorData = rawData.lineCategory.map(entry => ({
  entity: entry.entity,
  color: entry.category === 'internal' ? SPREADLINE_INTERNAL_COLOR : SPREADLINE_EXTERNAL_COLOR
}));
spreadline.load(lineColorData, { entity: 'entity', color: 'color' }, 'line');
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 4: Create documentation page

**Files:**
- Create: `src/app/docs/spreadline_json/page.tsx`

Static Next.js page documenting:
- Section 1: Updated JSON schema with comments on every attribute
- Section 2: Improvement suggestions for remaining fields

**Step 1: Create page**

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS
