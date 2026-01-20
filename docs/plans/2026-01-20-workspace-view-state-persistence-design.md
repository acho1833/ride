# Workspace View State Persistence Design

## Overview

Store viewport (scale, pan) and entity positions in MongoDB as a user-specific overlay on top of workspace data from the external API. Enables users to save their graph layout and restore it on subsequent visits.

## Data Flow

```
External API (workspace data) + MongoDB (view state) → Merged on load
User interactions (drag, pan, zoom) → Debounced save → MongoDB
```

## Data Model

### WorkspaceViewState

```typescript
interface WorkspaceViewState {
  id: string;
  workspaceId: string;           // Links to external workspace
  sid: string;                   // Owner's user ID for security verification
  scale: number;                 // Zoom level
  panX: number;                  // Viewport X offset
  panY: number;                  // Viewport Y offset
  entityPositions: Record<string, { x: number; y: number }>;  // entityId -> position
  updatedAt: Date;
}
```

- Stored in MongoDB collection `workspaceViewState`
- Unique index on `workspaceId`
- All operations verify `sid` matches requesting user

## API Design

### 1. Get Workspace (enhanced existing endpoint)

```
GET /workspaces/:id
```

- Returns workspace data from external API
- Fetches and merges view state from MongoDB
- If no saved view state exists, `viewState` is `null` (client will auto-fit and save)

### 2. Save View State (new endpoint)

```
PUT /workspaces/:workspaceId/view-state
```

- Input: `{ scale, panX, panY, entityPositions }`
- Upserts the view state in MongoDB
- Verifies `sid` matches (if existing record)
- Sets `sid` from context on create

### 3. Delete Workspace (new endpoint)

```
DELETE /workspaces/:id
```

- Deletes workspace (external API call if needed)
- Also deletes view state from MongoDB
- Verifies `sid` matches

## Client-Side Behavior

### Loading Workspace

1. Fetch workspace via `useWorkspaceQuery`
2. If `viewState` exists:
   - Apply saved `scale`, `panX`, `panY` to D3 zoom transform
   - Apply saved `entityPositions` to nodes (override API positions)
3. If `viewState` is `null`:
   - Use positions from external API (or D3 force simulation if none)
   - Auto-fit viewport to show all nodes
   - Save this initial state to MongoDB

### Saving View State

**Trigger:** Debounced (500ms) after user interactions:
- Entity drag end
- Zoom end
- Pan end

**Behavior:**
- Optimistic update (UI already reflects the change)
- Single API attempt, no retries
- On error: show subtle toast, keep local state
- No React Query invalidation (we already have latest state locally)

### Merge Logic

API coordinates are the base, saved MongoDB positions override when present:

```
Final position = savedEntityPositions[entityId] ?? apiEntity.coordinates
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| New workspace, no saved state | Auto-fit viewport, save initial state |
| New entity added via external API | Uses API-provided coordinates (no saved position for it) |
| Entity removed from external API | Orphaned position in `entityPositions` is ignored |
| Save fails | Toast error, keep local state, user can continue working |
| Workspace deleted | View state automatically cleaned up from MongoDB |
| Different user tries to access | `sid` check fails, returns error |

## File Structure

### New Files

```
src/models/workspace-view-state.model.ts            # Interface + Zod schema
src/collections/workspace-view-state.collection.ts  # Mongoose model

src/features/workspace/hooks/useWorkspaceViewStateMutation.ts  # Optimistic save hook
```

### Modified Files

```
src/lib/react-query/react-query.provider.tsx        # Disable retries globally (retry: 0)

src/features/workspace/server/routers.ts            # Add saveViewState, delete endpoints
src/features/workspace/server/services/workspace.service.ts  # Add view state ops, merge on get, cleanup on delete

src/features/workspace/components/workspace.component.tsx       # Use mutation hook, pass saveViewState to graph
src/features/workspace/components/workspace-graph.component.tsx # Accept saveViewState prop, debounced save on interactions
```

## Implementation Notes

### Debounce Strategy

Single debouncer batches all changes (entity positions + viewport) into one save call:

```typescript
// In workspace-graph.component.tsx
const debouncedSave = useMemo(
  () => debounce((state: ViewStateInput) => saveViewState(state), 500),
  [saveViewState]
);

// Called on drag end, zoom end, pan end
const collectAndSave = () => {
  debouncedSave({
    workspaceId,
    scale: currentTransform.k,
    panX: currentTransform.x,
    panY: currentTransform.y,
    entityPositions: collectEntityPositions()
  });
};
```

### Global React Query Config

```typescript
// react-query.provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 0  // Single attempt for all mutations
    }
  }
});
```

### Mutation Hook Pattern

```typescript
// useWorkspaceViewStateMutation.ts
export const useWorkspaceViewStateMutation = () => {
  return useMutation(
    orpc.workspace.saveViewState.mutationOptions({
      onError: () => {
        toast.error('Failed to save view state');
      }
      // No onSuccess invalidation - optimistic
    })
  );
};
```

## Future Considerations

- Multi-select entity drag (data structure already supports via `entityPositions` map)
- Undo/redo for position changes
- View state versioning for conflict resolution
