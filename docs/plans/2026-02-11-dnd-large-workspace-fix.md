# DnD Large Workspace Fix — Race Condition & Performance

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two bugs when drag-dropping an entity onto a large workspace (2000+ entities): (1) drop position gets overwritten by a race condition so the node never appears, (2) the server-side add is slow due to DELETE ALL + INSERT ALL pattern across thousands of SQL rows.

**Architecture:** Fix the race condition by having `handleSaveViewState` merge pending drop positions so the graph's debouncedSave can never overwrite them. Fix performance by replacing the per-entity/per-relationship SQL tables (`workspace_entity`, `workspace_relationship`) with a single `workspace_state` table storing one JSON TEXT blob per workspace. Also simplify `findConnectingRelationships` to avoid a giant IN clause.

**Tech Stack:** React (refs), SQLite (sql.js), Zustand, React Query

---

## Bug 1: Race Condition — Drop Position Overwritten

**Root cause:** When user drops an entity, `handleAddEntity` saves the drop position via `saveViewState`. But the graph's `debouncedSave` (500ms) fires shortly after and saves all node positions from `nodesRef.current` — which does NOT include the new entity yet. The optimistic cache update from `debouncedSave` overwrites the drop position. When the mutation completes and the graph re-renders, the new node has no saved position, falls back to a random location, and gets viewport-culled.

### Task 1: Fix the race condition in workspace.component.tsx

**Files:**
- Modify: `src/features/workspace/components/workspace.component.tsx`

**Step 1: Add a pendingPositionsRef and modify handleSaveViewState to merge pending positions**

In `workspace.component.tsx`, add a `useRef` to track entity positions that have been dropped but not yet picked up by the graph. Modify `handleSaveViewState` to merge them into every save.

```typescript
// Add ref near other refs/state
const pendingPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

// Modify handleSaveViewState to merge pending drop positions
const handleSaveViewState = useCallback(
  (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => {
    const entityPositions = { ...input.entityPositions, ...pendingPositionsRef.current };
    saveViewState({ ...input, workspaceId, entityPositions });
  },
  [saveViewState, workspaceId]
);
```

**Step 2: Store the drop position as pending in handleAddEntity, clear on success**

```typescript
const handleAddEntity = useCallback(
  (entityId: string, position: { x: number; y: number }) => {
    // Store drop position so debouncedSave merges it into every save
    pendingPositionsRef.current[entityId] = position;

    addEntities(
      { workspaceId, entityIds: [entityId] },
      {
        onSuccess: () => {
          // Entity is now in the graph — clear pending position
          delete pendingPositionsRef.current[entityId];
          setSelectedEntityIds(workspaceId, [entityId]);
        }
      }
    );

    // Save position immediately so it's available right away
    const currentPositions = workspace?.viewState?.entityPositions ?? {};
    saveViewState({
      workspaceId,
      scale: workspace?.viewState?.scale ?? 1,
      panX: workspace?.viewState?.panX ?? 0,
      panY: workspace?.viewState?.panY ?? 0,
      entityPositions: {
        ...currentPositions,
        [entityId]: position
      }
    });
  },
  [addEntities, saveViewState, workspaceId, workspace?.viewState, setSelectedEntityIds]
);
```

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "fix: prevent debouncedSave from overwriting drop position on large graphs"
```

---

## Bug 2: Slow addEntitiesToWorkspace — Server Performance

**Root cause:** Three issues in `workspace.mock-service.ts`:
1. `setWorkspaceState` does DELETE ALL rows + INSERT ALL rows (2430 deletes + 2430 inserts to add 1 entity)
2. `findConnectingRelationships` builds an IN clause with 2430 placeholders
3. `addEntitiesToWorkspace` calls `getWorkspaceById` at the end (redundant read — the caller in `workspace.service.ts` also calls `getWorkspaceById`)

### Task 2: Migrate workspace state storage from per-row SQL tables to JSON TEXT

**Files:**
- Modify: `src/lib/mock-db.ts` — add `workspace_state` table DDL
- Modify: `src/features/workspace/server/services/workspace.mock-service.ts` — rewrite to use JSON storage

**Step 2.1: Add new `workspace_state` table to DDL in mock-db.ts**

Add after the existing table definitions:

```sql
CREATE TABLE IF NOT EXISTS workspace_state (
  sid TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{"entityList":[],"relationshipList":[]}',
  PRIMARY KEY (sid, workspace_id)
);
```

Keep the old `workspace_entity` and `workspace_relationship` tables in place for now (no migration needed — data is ephemeral mock data that gets regenerated).

**Step 2.2: Rewrite `getWorkspaceState` to read JSON**

```typescript
function getWorkspaceState(sid: string, workspaceId: string): WorkspaceState {
  const db = getDb();
  const row = db
    .prepare('SELECT data FROM workspace_state WHERE sid = ? AND workspace_id = ?')
    .get(sid, workspaceId) as { data: string } | undefined;

  if (!row) return { entityList: [], relationshipList: [] };
  return JSON.parse(row.data) as WorkspaceState;
}
```

**Step 2.3: Rewrite `setWorkspaceState` to write JSON**

```typescript
function setWorkspaceState(sid: string, workspaceId: string, state: WorkspaceState): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO workspace_state (sid, workspace_id, data) VALUES (?, ?, ?)')
    .run(sid, workspaceId, JSON.stringify(state));
}
```

**Step 2.4: Simplify `findConnectingRelationships` to avoid giant IN clause**

Instead of building an IN clause with 2430 IDs, query all relationships for the new entity and filter in JS:

```typescript
async function findConnectingRelationships(entityId: string, existingEntityIds: Set<string>): Promise<RelationshipResponse[]> {
  if (existingEntityIds.size === 0) return [];

  const db = getDb();
  const relationships = db
    .prepare(
      `SELECT relationship_id as relationshipId, predicate,
              source_entity_id as sourceEntityId, related_entity_id as relatedEntityId
       FROM relationship
       WHERE source_entity_id = ? OR related_entity_id = ?`
    )
    .all(entityId, entityId) as RelationshipResponse[];

  return relationships.filter(
    r =>
      (r.sourceEntityId === entityId && existingEntityIds.has(r.relatedEntityId)) ||
      (r.relatedEntityId === entityId && existingEntityIds.has(r.sourceEntityId))
  );
}
```

**Step 2.5: Eliminate redundant getWorkspaceById call in addEntitiesToWorkspace**

Return the in-memory state directly instead of re-reading from SQLite:

```typescript
export async function addEntitiesToWorkspace(workspaceId: string, entityIds: string[], sid: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(sid, workspaceId);
  // ... (entity fetching and relationship finding logic stays the same) ...

  setWorkspaceState(sid, workspaceId, state);

  // Return in-memory state directly (skip redundant SQLite read)
  return {
    id: workspaceId,
    name: `Workspace ${workspaceId}`,
    entityList: state.entityList,
    relationshipList: state.relationshipList
  };
}
```

Apply the same pattern to `removeEntitiesFromWorkspace` and `setWorkspaceData` — return in-memory state instead of calling `getWorkspaceById`.

**Step 2.6: Run existing tests**

Run: `npm test -- --testPathPattern=workspace.mock-service`
Expected: All 5 tests pass (behavior unchanged, only storage mechanism changed).

**Step 2.7: Commit**

```bash
git add src/lib/mock-db.ts src/features/workspace/server/services/workspace.mock-service.ts
git commit -m "perf: store workspace state as JSON TEXT instead of per-row SQL tables"
```

---

## Task 3: Remove Trace Logs

**Files:**
- Modify: `src/features/entity-card/components/entity-card.component.tsx`
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`
- Modify: `src/features/workspace/components/workspace.component.tsx`
- Modify: `src/features/workspace/hooks/useWorkspaceAddEntitiesMutation.ts`

**Step 1: Remove all `console.log('[DND-TRACE]` lines and the `dragOverLoggedRef` from all four files. Restore the mutation hook callbacks to their original signatures (remove `variables` params where they were only used for logging).**

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove DND-TRACE debug logging"
```
