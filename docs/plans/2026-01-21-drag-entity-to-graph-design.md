# Drag Entity Card to Workspace Graph

## Overview

Users can drag any `EntityCardComponent` onto a workspace graph (`.ws` file). The entity is added at the exact drop position. If the entity already exists on the graph, a "not allowed" cursor is shown during drag.

## Data Flow

```
1. User starts dragging EntityCardComponent
   └─> HTML5 drag starts
   └─> Custom drag image created (blue circle + icon)
   └─> Entity data attached via dataTransfer
   └─> Dragging entity ID stored in module-level variable

2. User drags over workspace graph
   └─> Check if dragging entity exists in entityMap
       ├─> YES: Show 'none' (not allowed) cursor
       └─> NO: Show 'copy' cursor

3. User drops on graph
   └─> Parse entity data from dataTransfer
   └─> Check if entity already exists (via entityMap)
       ├─> YES: Ignore drop (user already saw not-allowed cursor)
       └─> NO: Convert mouse coords → SVG coords
           └─> Call addEntities API
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
- Add module-level `draggingEntityId` variable with `getDraggingEntityId()` export
- Add `onDragStart` handler that:
  - Sets `draggingEntityId` for drop target to check existence
  - Sets entity data via `dataTransfer.setData('application/json', JSON.stringify(entity))`
  - Creates and sets custom drag image (blue circle + icon)
- Add `onDragEnd` handler that clears `draggingEntityId`
- Add a hidden drag image element (ref) that renders the node preview

**Drag Image:**
- Blue circle (matching graph node: `hsl(210, 70%, 50%)`, radius 20px)
- White entity icon centered (using SVG symbol reference)

### 2. WorkspaceGraphComponent

**File:** `src/features/workspace/components/workspace-graph.component.tsx`

Changes:
- Add `screenToSvgCoords` function outside component
- New prop: `entityMap: Map<string, Entity>` for O(1) lookups
- New prop: `onAddEntity: (entityId: string, position: { x: number; y: number }) => void`
- Add `onDragOver` handler that:
  - Checks if dragging entity exists via `entityMap.has(getDraggingEntityId())`
  - Sets `dropEffect` to 'none' if exists, 'copy' otherwise
- Add `onDrop` handler that:
  - Parses entity from dataTransfer
  - Checks if entity exists in entityMap (silent return if exists)
  - Converts coordinates and calls `onAddEntity`

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

### 3. WorkspaceComponent

**File:** `src/features/workspace/components/workspace.component.tsx`

Changes:
- Import and use `useWorkspaceAddEntitiesMutation` hook
- Create `entityMap` via `useMemo` from `workspace.entityList`
- Pass `entityMap` to `WorkspaceGraphComponent`
- Pass `onAddEntity` callback that:
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

2. **Module-level dragging entity ID** - Simple solution since only one drag can happen at a time. Allows dragover to check existence without reading dataTransfer (browser security restriction).

3. **"Not allowed" cursor for duplicates** - Visual feedback during drag instead of modal on drop. User sees immediately if entity exists.

4. **`entityMap` for O(1) lookups** - Created once in parent, passed to graph. Will be reused for future features that need entity lookups.

5. **Ignore drops on non-workspace targets** - No modal or error; just silently ignore

6. **`screenToSvgCoords` in graph file but outside component** - Keeps it close to usage, avoids global utils, remains testable

7. **`onAddEntity` passed as prop** - Keeps graph component focused on rendering; parent handles mutation (consistent with existing `onSaveViewState` pattern)

## Review

### Changes Made

1. **EntityCardComponent** - Added drag support with custom drag image showing a blue circle with entity icon. Module-level variable tracks dragging entity ID for drop targets.

2. **WorkspaceGraphComponent** - Added drop zone with dragover/drop handlers. Uses `entityMap` for O(1) existence checks. Shows "not allowed" cursor when dragging existing entity.

3. **WorkspaceComponent** - Creates `entityMap` from entity list, handles add entity mutation and position saving.

4. **useWorkspaceAddEntitiesMutation** - New hook wrapping the existing addEntities endpoint.

5. **Centralized Mock Data** - Created `src/lib/mock-data/` module with shared entity data to ensure consistent IDs across entity search and workspace services. Both services now use the same entity pool with IDs like `person-1`, `org-1`, etc.

### Files Created/Modified

**Created:**
- `src/lib/mock-data/index.ts` - Exports shared mock data utilities
- `src/lib/mock-data/entities.ts` - Centralized entity generation with consistent IDs
- `src/features/workspace/hooks/useWorkspaceAddEntitiesMutation.ts` - Mutation hook for adding entities

**Modified:**
- `src/features/entity-card/components/entity-card.component.tsx` - Added draggable support
- `src/features/workspace/components/workspace-graph.component.tsx` - Added drop zone handlers
- `src/features/workspace/components/workspace.component.tsx` - Added entityMap and handleAddEntity
- `src/features/entity-search/server/services/entity.mock-service.ts` - Uses shared mock data
- `src/features/workspace/server/services/workspace.mock-service.ts` - Uses shared mock data

### Testing Notes

- Drag entity card from search results onto workspace graph
- Verify custom drag image (blue circle with icon) appears
- Verify "not allowed" cursor when dragging entity that already exists
- Verify entity appears at exact drop position after successful drop
- Verify entity position persists across page reload
