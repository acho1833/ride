# Drag Entity to Existing Pattern Node - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow dragging entity cards onto existing pattern nodes to replace their type/filters, with visual drop-target highlighting.

**Architecture:** Add drag-over/drop event handling to the custom pattern node component. Add a store action to update an existing node from entity data. Keep existing canvas-level drop (creates new node) unchanged.

**Tech Stack:** React, @xyflow/react, Zustand, Tailwind CSS

---

### Task 1: Add `updateNodeFromEntity` store action

**Files:**
- Modify: `src/stores/pattern-search/pattern-search.store.ts` (lines 32-65, 93-277)
- Modify: `src/stores/pattern-search/pattern-search.selector.ts` (lines 75-95)

**Step 1: Add action to PatternSearchActions interface**

In `pattern-search.store.ts`, add to the `PatternSearchActions` interface:

```typescript
/** Update an existing node with entity data (replaces type and filters, selects node) */
updateNodeFromEntity: (nodeId: string, entityType: string, entityName: string) => void;
```

**Step 2: Implement the action in createPatternSearchSlice**

After the `addNodeFromEntity` action (line 145), add:

```typescript
updateNodeFromEntity: (nodeId, entityType, entityName) =>
  set(state => ({
    patternSearch: {
      ...state.patternSearch,
      nodes: state.patternSearch.nodes.map(n =>
        n.id === nodeId
          ? { ...n, type: entityType, filters: [{ attribute: 'labelNormalized', patterns: [entityName] }] }
          : n
      ),
      selectedNodeId: nodeId,
      selectedEdgeId: null
    }
  })),
```

**Step 3: Expose action in selector**

In `pattern-search.selector.ts`, add `updateNodeFromEntity` to the `usePatternSearchActions` return object.

**Step 4: Verify build**

Run: `npm run lint`

---

### Task 2: Add drop-target handling to PatternNodeComponent

**Files:**
- Modify: `src/features/pattern-search/components/pattern-node.component.tsx`

**Step 1: Add drag state and handlers to PatternNodeComponent**

- Add `useState` for `isDragOver` boolean
- Add `nodeId` to the `PatternNodeData` interface
- Add `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers to the root `<div>`
- On drop: parse entity JSON, call `updateNodeFromEntity` via a callback prop
- Apply visual highlight classes when `isDragOver` is true

**Step 2: Pass nodeId and updateNodeFromEntity through React Flow node data**

In `pattern-builder.component.tsx`, add `nodeId: node.id` and `updateNodeFromEntity` to the `data` prop when converting store nodes to flow nodes.

**Step 3: Verify build**

Run: `npm run lint`

---

### Task 3: Commit

Run: `git add . && git commit -m "feat: drag entity onto existing pattern node to replace type/filters"`

---

## Review

### Changes Made (4 files)

| File | Change |
|------|--------|
| `src/stores/pattern-search/pattern-search.store.ts` | Added `updateNodeFromEntity` action — maps over nodes, replaces type + filters for target node, selects it |
| `src/stores/pattern-search/pattern-search.selector.ts` | Exposed `updateNodeFromEntity` in `usePatternSearchActions` |
| `src/features/pattern-search/components/pattern-node.component.tsx` | Added drag-over/drop handlers with `isDragOver` state for visual highlight (`ring-2 ring-primary/30 bg-primary/10`). `stopPropagation()` prevents canvas-level handler from firing. |
| `src/features/pattern-search/components/pattern-builder.component.tsx` | Passes `nodeId` and `updateNodeFromEntity` through React Flow node `data` prop |

### Behavior Summary
- **Drop on existing node**: Replaces type + filters, auto-selects, shows config panel
- **Drop on empty canvas**: Creates new node (unchanged)
- **Drag hover over node**: Primary-colored ring + tinted background
- **Node label**: Preserved on drop (only type/filters replaced)

### Verification
- ESLint: 0 errors
- TypeScript: clean compilation
