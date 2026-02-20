# Spreadline Relation Type Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a relationship type dropdown to the spreadline toolbar (leftmost position) with "Co-co-author" as the only/default option, extensible for future types.

**Architecture:** Lift `relationTypes` state to `SpreadlineTabComponent`, pass down to both `SpreadlineComponent` and `SpreadlineGraphComponent` as props. The dropdown UI lives in `SpreadlineComponent`'s toolbar and calls back to update the parent state.

**Tech Stack:** Shadcn Select component (already installed), existing constants pattern.

---

### Task 1: Add relation type options constant

**Files:**
- Modify: `src/features/spreadlines/const.ts`

**Step 1: Add the options array constant**

Add after line 9 (`SPREADLINE_DEFAULT_RELATION_TYPES`):

```typescript
/** Available relation types for the dropdown */
export const SPREADLINE_RELATION_TYPE_OPTIONS = ['Co-co-author'] as const;
```

**Step 2: Commit**

```bash
git add src/features/spreadlines/const.ts
git commit -m "feat: add spreadline relation type options constant"
```

---

### Task 2: Lift relationTypes state to SpreadlineTabComponent and pass as props

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-tab.component.tsx`
- Modify: `src/features/spreadlines/components/spreadline.component.tsx`
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add state + pass props in SpreadlineTabComponent**

In `spreadline-tab.component.tsx`:
- Add `relationTypes` state initialized to `SPREADLINE_DEFAULT_RELATION_TYPES`
- Pass `relationTypes` and `onRelationTypesChange` to `SpreadlineComponent`
- Pass `relationTypes` to `SpreadlineGraphComponent`
- Remove direct `useSpreadlineRawDataQuery` call from this component — pass `relationTypes` down instead

**Step 2: Update SpreadlineComponent Props**

In `spreadline.component.tsx`:
- Add `relationTypes` and `onRelationTypesChange` to Props interface
- Use the `relationTypes` prop instead of `SPREADLINE_DEFAULT_RELATION_TYPES` in the query hook call

**Step 3: Update SpreadlineGraphComponent Props**

In `spreadline-graph.component.tsx`:
- Add `relationTypes` to Props interface
- Use the `relationTypes` prop instead of `SPREADLINE_DEFAULT_RELATION_TYPES` in the query hook call

**Step 4: Commit**

```bash
git add src/features/spreadlines/components/
git commit -m "feat: lift relationTypes state to spreadline tab component"
```

---

### Task 3: Add dropdown to SpreadlineComponent toolbar

**Files:**
- Modify: `src/features/spreadlines/components/spreadline.component.tsx`

**Step 1: Add the Shadcn Select dropdown as leftmost toolbar item**

In the toolbar `<div>` (line ~198), add before the entity/blocks info span:

```tsx
<Select value={relationTypes[0]} onValueChange={(val) => onRelationTypesChange([val])}>
  <SelectTrigger className="h-7 w-auto gap-1 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {SPREADLINE_RELATION_TYPE_OPTIONS.map(type => (
      <SelectItem key={type} value={type}>{type}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Step 2: Verify in browser**

Open a .sl file, confirm the dropdown appears leftmost in the toolbar with "Co-co-author" selected.

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/spreadline.component.tsx
git commit -m "feat: add relation type dropdown to spreadline toolbar"
```

---

### Task 4: Build and lint check

**Step 1: Run lint**
```bash
npm run lint
```

**Step 2: Run build**
```bash
npm run build
```

**Step 3: Fix any issues and commit**
