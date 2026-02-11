# Drag Entity to Pattern Builder - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users add entities to the pattern builder from the workspace graph popup and by dragging entity cards from search results.

**Architecture:** Add a new `addNodeFromEntity` store action that creates pre-populated pattern nodes. Wire it to a new popup button and a drop handler on the React Flow canvas.

**Tech Stack:** Zustand, React, React Flow (@xyflow/react), lucide-react, HTML5 drag-and-drop

---

### Task 1: Add `addNodeFromEntity` store action

**Files:**
- Modify: `src/stores/pattern-search/pattern-search.store.ts`
- Modify: `src/stores/pattern-search/pattern-search.selector.ts`

**Step 1: Add the action to the store interface and implementation**

In `src/stores/pattern-search/pattern-search.store.ts`:

Add to `PatternSearchActions` interface (after `addNode`):

```typescript
/** Add a new node pre-populated from an entity (type + name filter) */
addNodeFromEntity: (entityType: string, entityName: string) => void;
```

Add the implementation in `createPatternSearchSlice` (after `addNode`):

```typescript
addNodeFromEntity: (entityType, entityName) =>
  set(state => {
    const newNode: PatternNode = {
      id: `node-${Date.now()}`,
      label: getNextNodeLabel(state.patternSearch.nodes),
      type: entityType,
      filters: [{ attribute: 'labelNormalized', patterns: [entityName] }],
      position: getNextNodePosition(state.patternSearch.nodes)
    };
    return {
      patternSearch: {
        ...state.patternSearch,
        nodes: [...state.patternSearch.nodes, newNode],
        selectedNodeId: newNode.id,
        selectedEdgeId: null
      }
    };
  }),
```

**Step 2: Export the action in the selector**

In `src/stores/pattern-search/pattern-search.selector.ts`, add `addNodeFromEntity` to the `usePatternSearchActions` return object:

```typescript
addNodeFromEntity: state.addNodeFromEntity,
```

Place it after the `addNode` line inside the `useShallow` callback.

**Step 3: Run build to verify no type errors**

Run: `npm run build`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add src/stores/pattern-search/pattern-search.store.ts src/stores/pattern-search/pattern-search.selector.ts
git commit -m "feat: add addNodeFromEntity store action for pattern builder"
```

---

### Task 2: Add "Add to Pattern" button in entity detail popup

**Files:**
- Modify: `src/features/workspace/components/entity-detail-popup.component.tsx`

**Step 1: Add imports and store hooks**

Add these imports:

```typescript
import { Crosshair } from 'lucide-react';
import { usePatternSearchActions } from '@/stores/pattern-search/pattern-search.selector';
import { useToolbarMode, useUiActions } from '@/stores/ui/ui.selector';
```

Inside the component, add hooks:

```typescript
const { addNodeFromEntity, setSearchMode } = usePatternSearchActions();
const { toggleToolbar } = useUiActions();
const toolbar = useToolbarMode();
```

**Step 2: Add the click handler**

```typescript
const handleAddToPattern = () => {
  // Open entity search panel if not already showing
  if (toolbar.left !== 'ENTITY_SEARCH') {
    toggleToolbar('left', 'ENTITY_SEARCH');
  }
  // Switch to advanced mode
  setSearchMode('advanced');
  // Create pattern node from entity
  addNodeFromEntity(entity.type, entity.labelNormalized);
};
```

**Step 3: Add the button to the toolbar prop**

Replace the current `toolbar` prop on `DetailPopupComponent` with a fragment containing both buttons:

```tsx
toolbar={
  <>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={handleAddToPattern}
      title="Add to pattern search"
    >
      <Crosshair className="h-3 w-3" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={handleExpand}
      disabled={isExpandDisabled}
      title="Add related entities"
    >
      <Expand className="h-3 w-3" />
    </Button>
  </>
}
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src/features/workspace/components/entity-detail-popup.component.tsx
git commit -m "feat: add 'Add to Pattern' button in entity detail popup"
```

---

### Task 3: Add drop handler on pattern builder canvas

**Files:**
- Modify: `src/features/pattern-search/components/pattern-builder.component.tsx`

**Step 1: Add the drop handlers**

Import `addNodeFromEntity` from the actions selector (already imported via `usePatternSearchActions`). Destructure it alongside the existing actions.

Add two callback handlers:

```typescript
// Allow entity cards to be dropped on the canvas
const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, []);

// Handle entity card drop - create pre-populated pattern node
const handleCanvasDrop = useCallback(
  (e: React.DragEvent) => {
    e.preventDefault();
    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) return;
    try {
      const entity = JSON.parse(jsonData);
      if (entity.type && entity.labelNormalized) {
        addNodeFromEntity(entity.type, entity.labelNormalized);
      }
    } catch {
      // Ignore invalid JSON
    }
  },
  [addNodeFromEntity]
);
```

**Step 2: Attach handlers to the React Flow container div**

Change the div that wraps `<ReactFlow>` (the one with `className="min-h-0 flex-1"`):

```tsx
<div className="min-h-0 flex-1" onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop}>
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add src/features/pattern-search/components/pattern-builder.component.tsx
git commit -m "feat: add drop handler for entity cards on pattern builder canvas"
```

---

### Task 4: Format and final verification

**Step 1: Format all modified files**

Run: `npm run format`

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run full build**

Run: `npm run build`
Expected: Clean build

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Final commit (if format changed anything)**

```bash
git add -A
git commit -m "style: format drag-entity-to-pattern changes"
```
