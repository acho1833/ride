# Graph Ctrl+Click Pin Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ctrl+click (cmd+click on Mac) on spreadline graph nodes to toggle entity pinning, reusing existing path highlighting.

**Architecture:** Two small edits. (1) Add `onEntityPin` callback prop to `SpreadlineGraphComponent` with a ctrl+click handler on nodes. (2) Pass `setPinnedEntityNames` from the parent tab component.

**Tech Stack:** React, D3, TypeScript

---

### Task 1: Add `onEntityPin` prop and ctrl+click handler to SpreadlineGraphComponent

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-graph.component.tsx`

**Step 1: Add `onEntityPin` to Props interface (line 160)**

After the existing `onLinkDoubleClick` prop, add:

```typescript
  onEntityPin?: (names: string[]) => void;
```

**Step 2: Destructure the new prop (line 168)**

Add `onEntityPin` to the destructured props.

**Step 3: Add a ref for the callback (after line 199)**

Follow the same ref pattern used for `onLinkDoubleClick`:

```typescript
const onEntityPinRef = useRef(onEntityPin);
onEntityPinRef.current = onEntityPin;
```

**Step 4: Add a ref for pinnedEntityNames (near other refs)**

We need a ref to read current pinned names inside the D3 click handler:

```typescript
const pinnedEntityNamesRef = useRef(pinnedEntityNames);
pinnedEntityNamesRef.current = pinnedEntityNames;
```

**Step 5: Add ctrl+click handler on nodes (after `nodeMerged.call(drag)` at line 549)**

```typescript
nodeMerged.on('click', function (event: MouseEvent, d: SpreadlineGraphNode) {
  if (!(event.ctrlKey || event.metaKey)) return;
  if (d.id === rawData?.egoId) return; // Can't pin ego
  event.stopPropagation();
  const current = pinnedEntityNamesRef.current;
  const updated = current.includes(d.name) ? current.filter(n => n !== d.name) : [...current, d.name];
  onEntityPinRef.current?.(updated);
});
```

**Step 6: Verify build**

Run: `npm run build`
Expected: PASS

**Step 7: Commit**

```bash
git add src/features/spreadlines/components/spreadline-graph.component.tsx
git commit -m "feat(spreadline): add ctrl+click on graph nodes to toggle pin"
```

---

### Task 2: Pass `onEntityPin` from spreadline-tab to graph component

**Files:**
- Modify: `src/features/spreadlines/components/spreadline-tab.component.tsx`

**Step 1: Add `onEntityPin` prop to SpreadlineGraphComponent usage (after line 130)**

```tsx
<SpreadlineGraphComponent
  rawData={rawData ?? null}
  selectedTimes={selectedTimes}
  pinnedEntityNames={pinnedEntityNames}
  filteredEntityNames={filteredEntityNames}
  onLinkDoubleClick={handleLinkDoubleClick}
  onEntityPin={setPinnedEntityNames}
/>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/spreadlines/components/spreadline-tab.component.tsx
git commit -m "feat(spreadline): wire onEntityPin callback to graph component"
```
