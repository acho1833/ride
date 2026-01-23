# Multi-Select Entities in Workspace Graph

## Overview

Allow users to multi-select entity nodes in the workspace graph using Ctrl+Click, visually highlight them with blue fill, and move them as a group when dragging.

## Interaction Rules

| Action | Result |
|--------|--------|
| Left click on node | Select only that node (clear others) |
| Ctrl + Left click on node | Toggle that node in/out of selection |
| Left click on empty canvas | Clear all selection |
| Right click on unselected node | Select only that node, show context menu |
| Right click on selected node | Keep current selection, show context menu |
| Drag a selected node | All selected nodes move together |
| Drag an unselected node | Only that node moves (current behavior) |

## Visual Treatment

- Selected nodes: `nodeColorSelected` = `hsl(210, 70%, 50%)` (blue fill)
- Unselected nodes: `nodeColor` = `hsl(175, 40%, 45%)` (teal fill)

## Zustand Store Structure

```typescript
// State - keyed by workspaceId for extensibility
interface WorkspaceGraphState {
  workspaceGraph: Record<string, {
    selectedEntityIds: string[];
  }>;
}

// Actions
interface WorkspaceGraphActions {
  setSelectedEntityIds: (workspaceId: string, ids: string[]) => void;
  toggleEntitySelection: (workspaceId: string, id: string) => void;
  clearEntitySelection: (workspaceId: string) => void;
}
```

## Data Flow

1. **Click/right-click handler** (in workspace-graph D3 code) → calls action callbacks passed as props
2. **Store updates** → `WorkspaceComponent` re-reads via selector hook
3. **Prop passed** → `selectedEntityIds` prop to `WorkspaceGraphComponent`
4. **useEffect** → watches prop, updates D3 node fill colors
5. **External trigger** → any component can call store actions, graph reacts via prop

## Group Drag

- On drag start: check if dragged node is in `selectedEntityIds`
  - If yes: move all selected nodes by same delta
  - If no: move only the dragged node (current behavior)
- During drag: update positions + connected links for all moving nodes
- On drag end: existing `collectAndSave()` fires (debounced 500ms), saves all positions

## Cleanup

- When `WorkspaceComponent` unmounts (tab closed), a cleanup `useEffect` calls `clearEntitySelection(workspaceId)` to remove that workspace's selection state

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/stores/workspace-graph/workspace-graph.store.ts` | Zustand slice: per-workspace selection state and actions |
| `src/stores/workspace-graph/workspace-graph.selector.ts` | Selector hooks for components to read state/actions |

### Modified Files

| File | Change | Purpose |
|------|--------|---------|
| `src/stores/app.store.ts` | Register `WorkspaceGraphSlice` | Include new slice in global store |
| `src/features/workspace/components/workspace.component.tsx` | Read `selectedEntityIds` from store, pass as prop | Bridge store to graph component |
| `src/features/workspace/components/workspace-graph.component.tsx` | Add `selectedEntityIds` prop, action props, click handlers, useEffect for colors, group drag logic | Core interaction implementation |

## Implementation Tasks

- [x] Create `workspace-graph.store.ts` with slice definition
- [x] Create `workspace-graph.selector.ts` with selector hooks
- [x] Register slice in `app.store.ts`
- [x] Update `workspace.component.tsx` to read store, pass props, add cleanup
- [x] Add `selectedEntityIds` prop and action props to `workspace-graph.component.tsx`
- [x] Add `useEffect` to update node colors when prop changes
- [x] Add click handlers: left click, ctrl+click, canvas click
- [x] Add right-click handler: select unselected node before context menu
- [x] Implement group drag for selected nodes
- [x] Test build passes (lint clean, build succeeds)

## Review

### Summary of Changes

**New files (2):**
- `src/stores/workspace-graph/workspace-graph.store.ts` — Zustand slice with per-workspace selection state keyed by workspaceId. Three actions: set, toggle, clear.
- `src/stores/workspace-graph/workspace-graph.selector.ts` — `useSelectedEntityIds(workspaceId)` hook for reactive reads, `useWorkspaceGraphActions()` for stable action references.

**Modified files (3):**
- `src/stores/app.store.ts` — Registered the new `WorkspaceGraphSlice` in the combined store type and composition.
- `src/features/workspace/components/workspace.component.tsx` — Reads selection from store, passes `selectedEntityIds` + action callbacks as props to graph component. Cleanup `useEffect` clears state on unmount.
- `src/features/workspace/components/workspace-graph.component.tsx` — Accepts selection props. Adds: `useEffect` for color updates, click handlers (single/ctrl/canvas), right-click selection, group drag with delta-based movement, `selectedEntityIdsRef` for D3 drag access.

### Design Decisions
- **Props over direct store access in graph component** — keeps the graph component decoupled from Zustand; actions are passed as callbacks from the parent.
- **`selectedEntityIdsRef`** — D3 drag handlers need the latest selection without re-creating the D3 setup. A ref provides this.
- **`nodeElementMap`** — pre-computed map of node ID → `<g>` DOM element for O(1) access during group drag (same pattern as existing `nodeLinkMap`).
- **`updateLinksForNode` helper** — extracted to avoid duplicating link update logic between single and group drag paths.
- **Cleanup on unmount** — simpler than modifying the editor-tab component; co-locates cleanup with the feature that owns the state.
