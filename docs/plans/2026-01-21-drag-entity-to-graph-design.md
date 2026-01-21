# Drag Entity Card to Workspace Graph

## Overview

Users can drag any `EntityCardComponent` onto a workspace graph (`.ws` file). The entity is added at the exact drop position. If the entity already exists on the graph, an informational modal is shown.

## Data Flow

```
1. User starts dragging EntityCardComponent
   └─> HTML5 drag starts
   └─> Custom drag image created (blue circle + icon)
   └─> Entity data attached via dataTransfer

2. User drags over workspace graph
   └─> Graph shows it accepts drops (dragover handler)

3. User drops on graph
   └─> Parse entity data from dataTransfer
   └─> Check if entity already exists in workspace.entityList
       ├─> YES: Show informational modal, stop
       └─> NO: Convert mouse coords → SVG coords
           └─> Call addEntities API with position
           └─> Save position to entityPositions in view state
           └─> Graph re-renders with new node at exact position

4. User drops on non-workspace target
   └─> Ignore (do nothing)
```

## Component Changes

### 1. EntityCardComponent

**File:** `src/features/entity-card/components/entity-card.component.tsx`

Changes:
- Add optional `draggable?: boolean` prop (default `true`)
- When draggable: add `draggable="true"` attribute
- Add `onDragStart` handler that:
  - Sets entity data via `dataTransfer.setData('application/json', JSON.stringify(entity))`
  - Creates and sets custom drag image (blue circle + icon)
- Add a hidden drag image element (ref) that renders the node preview

**Drag Image:**
- Blue circle (matching graph node: `hsl(210, 70%, 50%)`, radius ~20px)
- White entity icon centered (using SVG symbol reference)

### 2. WorkspaceGraphComponent

**File:** `src/features/workspace/components/workspace-graph.component.tsx`

Changes:
- Add `screenToSvgCoords` function outside component (converts mouse position to SVG coordinates accounting for zoom/pan)
- New prop: `onAddEntity: (entityId: string, position: { x: number; y: number }) => void`
- Add `onDragOver` handler that calls `event.preventDefault()` to accept drops
- Add `onDrop` handler that:
  - Parses entity from dataTransfer
  - Checks if entity exists in `workspace.entityList`
  - If exists: opens info modal
  - If not: converts coordinates and calls `onAddEntity`
- Add state for info modal (open/close, entity name)

**screenToSvgCoords Function:**
```ts
function screenToSvgCoords(
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement,
  transform: d3.ZoomTransform
): { x: number; y: number } {
  const rect = svgElement.getBoundingClientRect();
  const svgX = screenX - rect.left;
  const svgY = screenY - rect.top;

  // Invert the zoom/pan transform
  return {
    x: (svgX - transform.x) / transform.k,
    y: (svgY - transform.y) / transform.k
  };
}
```

**Info Modal:**
- Using Shadcn Dialog component
- Title: "Entity Already Exists"
- Description: "{entity name} is already in this workspace"
- Single "OK" button to dismiss

### 3. WorkspaceComponent

**File:** `src/features/workspace/components/workspace.component.tsx`

Changes:
- Import and use `useWorkspaceAddEntitiesMutation` hook
- Pass `onAddEntity` callback to `WorkspaceGraphComponent` that:
  - Calls the add entities mutation
  - Saves the initial position to view state

### 4. New Mutation Hook

**File:** `src/features/workspace/hooks/useWorkspaceAddEntitiesMutation.ts`

- Mutation hook for the existing `addEntities` endpoint
- Invalidates workspace query on success
- Shows toast notifications for loading/success/error states

## File List

**Modified:**
- `src/features/entity-card/components/entity-card.component.tsx`
- `src/features/workspace/components/workspace-graph.component.tsx`
- `src/features/workspace/components/workspace.component.tsx`

**Created:**
- `src/features/workspace/hooks/useWorkspaceAddEntitiesMutation.ts`

## Design Decisions

1. **`draggable` prop defaults to `true`** - Most usages will want drag behavior; opt-out available with `draggable={false}`

2. **Drop-time validation** - Checking if entity exists happens at drop time, not during drag. This keeps implementation simple and handles multi-workspace scenarios.

3. **Info modal for duplicates** - Not an error state; just informational with simple "OK" dismiss

4. **Ignore drops on non-workspace targets** - No modal or error; just silently ignore

5. **`screenToSvgCoords` in graph file but outside component** - Keeps it close to usage, avoids global utils, remains testable

6. **`onAddEntity` passed as prop** - Keeps graph component focused on rendering; parent handles mutation (consistent with existing `onSaveViewState` pattern)
