# Workspace Graph Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add graph filtering by entity type and relationship predicate, with a toolbar + right-side filter panel UI.

**Architecture:** Extend existing workspace-graph Zustand store with filter state. Filtering is computed in workspace.component.tsx via useMemo before data reaches the graph. Two new UI components: toolbar (above graph) and filter panel (right sidebar).

**Tech Stack:** Zustand, React, Lucide icons (Eye, EyeOff, ListFilter, X), Shadcn ScrollArea + Badge + Button

---

### Task 1: Extend Zustand Store with Filter State + Actions

**Files:**
- Modify: `src/stores/workspace-graph/workspace-graph.store.ts`

**Step 1: Add filter fields to WorkspaceGraphEntry interface**

Add three new optional fields after the existing `openPopups` field:

```typescript
interface WorkspaceGraphEntry {
  selectedEntityIds?: string[];
  openPopups?: PopupState[];
  hiddenEntityTypes?: string[];    // NEW
  hiddenPredicates?: string[];     // NEW
  isFilterPanelOpen?: boolean;     // NEW
}
```

**Step 2: Add new actions to WorkspaceGraphActions interface**

Add after `updatePopupPosition`:

```typescript
export interface WorkspaceGraphActions {
  // ...existing actions...
  toggleEntityTypeVisibility: (workspaceId: string, entityType: string) => void;
  togglePredicateVisibility: (workspaceId: string, predicate: string) => void;
  resetFilters: (workspaceId: string) => void;
  setFilterPanelOpen: (workspaceId: string, open: boolean) => void;
}
```

**Step 3: Implement the four new actions in createWorkspaceGraphSlice**

Add after `updatePopupPosition` action:

```typescript
toggleEntityTypeVisibility: (workspaceId, entityType) =>
  set(state => {
    const entry = state.workspaceGraph[workspaceId] ?? {};
    const current = entry.hiddenEntityTypes ?? [];
    const updated = current.includes(entityType)
      ? current.filter(t => t !== entityType)
      : [...current, entityType];
    return {
      workspaceGraph: {
        ...state.workspaceGraph,
        [workspaceId]: { ...entry, hiddenEntityTypes: updated.length ? updated : undefined }
      }
    };
  }),

togglePredicateVisibility: (workspaceId, predicate) =>
  set(state => {
    const entry = state.workspaceGraph[workspaceId] ?? {};
    const current = entry.hiddenPredicates ?? [];
    const updated = current.includes(predicate)
      ? current.filter(p => p !== predicate)
      : [...current, predicate];
    return {
      workspaceGraph: {
        ...state.workspaceGraph,
        [workspaceId]: { ...entry, hiddenPredicates: updated.length ? updated : undefined }
      }
    };
  }),

resetFilters: workspaceId =>
  set(state => {
    const entry = state.workspaceGraph[workspaceId];
    if (!entry?.hiddenEntityTypes && !entry?.hiddenPredicates) return state;
    return {
      workspaceGraph: {
        ...state.workspaceGraph,
        [workspaceId]: { ...entry, hiddenEntityTypes: undefined, hiddenPredicates: undefined }
      }
    };
  }),

setFilterPanelOpen: (workspaceId, open) =>
  set(state => ({
    workspaceGraph: {
      ...state.workspaceGraph,
      [workspaceId]: { ...state.workspaceGraph[workspaceId], isFilterPanelOpen: open || undefined }
    }
  })),
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (new state/actions don't break anything, nothing uses them yet)

**Step 5: Commit**

```bash
git add src/stores/workspace-graph/workspace-graph.store.ts
git commit -m "feat(workspace): add filter state and actions to workspace-graph store"
```

---

### Task 2: Add Filter Selectors

**Files:**
- Modify: `src/stores/workspace-graph/workspace-graph.selector.ts`

**Step 1: Add selector constants and hooks**

Add after existing `EMPTY_POPUPS` constant:

```typescript
const EMPTY_HIDDEN: string[] = [];
```

Add after `useOpenPopups` selector:

```typescript
export const useHiddenEntityTypes = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.hiddenEntityTypes ?? EMPTY_HIDDEN);

export const useHiddenPredicates = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.hiddenPredicates ?? EMPTY_HIDDEN);

export const useIsFilterPanelOpen = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.isFilterPanelOpen ?? false);

export const useHiddenFilterCount = (workspaceId: string) =>
  useAppStore(
    (state: WorkspaceGraphSlice) =>
      (state.workspaceGraph[workspaceId]?.hiddenEntityTypes?.length ?? 0) +
      (state.workspaceGraph[workspaceId]?.hiddenPredicates?.length ?? 0)
  );
```

**Step 2: Add filter actions to useWorkspaceGraphActions**

Update the existing `useWorkspaceGraphActions` to include the four new actions:

```typescript
export const useWorkspaceGraphActions = () =>
  useAppStore(
    useShallow((state: WorkspaceGraphSlice) => ({
      setSelectedEntityIds: state.setSelectedEntityIds,
      toggleEntitySelection: state.toggleEntitySelection,
      clearEntitySelection: state.clearEntitySelection,
      openPopup: state.openPopup,
      closePopup: state.closePopup,
      updatePopupPosition: state.updatePopupPosition,
      toggleEntityTypeVisibility: state.toggleEntityTypeVisibility,
      togglePredicateVisibility: state.togglePredicateVisibility,
      resetFilters: state.resetFilters,
      setFilterPanelOpen: state.setFilterPanelOpen,
    }))
  );
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/stores/workspace-graph/workspace-graph.selector.ts
git commit -m "feat(workspace): add filter selector hooks"
```

---

### Task 3: Create Workspace Toolbar Component

**Files:**
- Create: `src/features/workspace/components/workspace-toolbar.component.tsx`

**Step 1: Create the toolbar component**

```typescript
'use client';

import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  hiddenCount: number;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
}

const WorkspaceToolbarComponent = ({ hiddenCount, isFilterPanelOpen, onToggleFilterPanel }: Props) => {
  return (
    <div className="bg-background flex h-8 shrink-0 items-center justify-end border-b px-2">
      <Button
        variant={isFilterPanelOpen ? 'secondary' : 'ghost'}
        size="sm"
        className="h-6 gap-1 px-2 text-xs"
        onClick={onToggleFilterPanel}
        title="Toggle Filters"
      >
        <ListFilter className="h-3.5 w-3.5" />
        <span>Filter</span>
        {hiddenCount > 0 && (
          <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
            {hiddenCount}
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default WorkspaceToolbarComponent;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (component isn't used yet, but should compile)

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace-toolbar.component.tsx
git commit -m "feat(workspace): create toolbar component with filter button"
```

---

### Task 4: Create Filter Panel Component

**Files:**
- Create: `src/features/workspace/components/workspace-filter-panel.component.tsx`

**Step 1: Create the filter panel component**

```typescript
'use client';

import { Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getEntityIconClass } from '@/lib/utils';

interface Props {
  entityTypes: string[];
  predicates: string[];
  hiddenEntityTypes: string[];
  hiddenPredicates: string[];
  onToggleEntityType: (entityType: string) => void;
  onTogglePredicate: (predicate: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const MAX_SECTION_HEIGHT = 160;

const WorkspaceFilterPanelComponent = ({
  entityTypes,
  predicates,
  hiddenEntityTypes,
  hiddenPredicates,
  onToggleEntityType,
  onTogglePredicate,
  onReset,
  onClose
}: Props) => {
  const hasActiveFilters = hiddenEntityTypes.length > 0 || hiddenPredicates.length > 0;

  return (
    <div className="bg-background/90 absolute top-0 right-0 bottom-[calc(var(--minimap-height,170px)+1rem)] z-10 flex w-52 flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Filters</span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {/* Entity Types Section */}
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase">Entity Types</span>
          <ScrollArea style={{ maxHeight: MAX_SECTION_HEIGHT }}>
            <div className="flex flex-col gap-0.5">
              {entityTypes.map(type => {
                const isHidden = hiddenEntityTypes.includes(type);
                return (
                  <button
                    key={type}
                    className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors"
                    onClick={() => onToggleEntityType(type)}
                  >
                    {isHidden ? (
                      <EyeOff className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <i className={`${getEntityIconClass(type)} text-xs`} />
                    <span className={isHidden ? 'text-muted-foreground line-through' : ''}>{type}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Relationships Section */}
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium uppercase">Relationships</span>
          <ScrollArea style={{ maxHeight: MAX_SECTION_HEIGHT }}>
            <div className="flex flex-col gap-0.5">
              {predicates.map(predicate => {
                const isHidden = hiddenPredicates.includes(predicate);
                return (
                  <button
                    key={predicate}
                    className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors"
                    onClick={() => onTogglePredicate(predicate)}
                  >
                    {isHidden ? (
                      <EyeOff className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className={isHidden ? 'text-muted-foreground line-through' : ''}>
                      {predicate.replace(/_/g, ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      {hasActiveFilters && (
        <div className="border-t px-3 py-2">
          <Button variant="ghost" size="sm" className="h-6 w-full text-xs" onClick={onReset}>
            Reset All
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceFilterPanelComponent;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace-filter-panel.component.tsx
git commit -m "feat(workspace): create filter panel with eye toggles and scrollable sections"
```

---

### Task 5: Wire Everything Together in workspace.component.tsx

**Files:**
- Modify: `src/features/workspace/components/workspace.component.tsx`

**Step 1: Add imports**

Add at the top with other imports:

```typescript
import WorkspaceToolbarComponent from './workspace-toolbar.component';
import WorkspaceFilterPanelComponent from './workspace-filter-panel.component';
import { useHiddenEntityTypes, useHiddenPredicates, useIsFilterPanelOpen, useHiddenFilterCount } from '@/stores/workspace-graph/workspace-graph.selector';
```

**Step 2: Add filter state hooks inside WorkspaceComponent**

After the existing `useWorkspaceGraphActions()` destructuring (line ~43), add the new selectors and destructure the new actions:

```typescript
const hiddenEntityTypes = useHiddenEntityTypes(workspaceId);
const hiddenPredicates = useHiddenPredicates(workspaceId);
const isFilterPanelOpen = useIsFilterPanelOpen(workspaceId);
const hiddenFilterCount = useHiddenFilterCount(workspaceId);
```

Also add the new actions to the existing `useWorkspaceGraphActions()` destructuring:

```typescript
const {
  setSelectedEntityIds, toggleEntitySelection, clearEntitySelection,
  openPopup, closePopup, updatePopupPosition,
  toggleEntityTypeVisibility, togglePredicateVisibility, resetFilters, setFilterPanelOpen  // NEW
} = useWorkspaceGraphActions();
```

**Step 3: Add derived filter data (after entityMap useMemo, around line ~97)**

```typescript
// Derive available entity types and predicates from workspace data
const entityTypes = useMemo<string[]>(() => {
  if (!workspace) return [];
  return [...new Set(workspace.entityList.map(e => e.type))].sort();
}, [workspace]);

const predicates = useMemo<string[]>(() => {
  if (!workspace) return [];
  return [...new Set(workspace.relationshipList.map(r => r.predicate))].sort();
}, [workspace]);

// Compute filtered entity list and map
const filteredEntityMap = useMemo<Map<string, Entity>>(() => {
  if (!workspace || hiddenEntityTypes.length === 0) return entityMap;
  const hiddenSet = new Set(hiddenEntityTypes);
  const map = new Map<string, Entity>();
  for (const [id, entity] of entityMap) {
    if (!hiddenSet.has(entity.type)) {
      map.set(id, entity);
    }
  }
  return map;
}, [workspace, entityMap, hiddenEntityTypes]);

// Compute filtered relationship list
const filteredRelationshipList = useMemo(() => {
  if (!workspace) return [];
  const { relationshipList } = workspace;
  if (hiddenEntityTypes.length === 0 && hiddenPredicates.length === 0) return relationshipList;
  const hiddenPredSet = new Set(hiddenPredicates);
  return relationshipList.filter(
    r =>
      !hiddenPredSet.has(r.predicate) &&
      filteredEntityMap.has(r.sourceEntityId) &&
      filteredEntityMap.has(r.relatedEntityId)
  );
}, [workspace, hiddenEntityTypes.length, hiddenPredicates, filteredEntityMap]);

// Build a filtered workspace object to pass to graph
const filteredWorkspace = useMemo(() => {
  if (!workspace) return workspace;
  if (hiddenEntityTypes.length === 0 && hiddenPredicates.length === 0) return workspace;
  return {
    ...workspace,
    entityList: [...filteredEntityMap.values()],
    relationshipList: filteredRelationshipList
  };
}, [workspace, hiddenEntityTypes.length, hiddenPredicates.length, filteredEntityMap, filteredRelationshipList]);
```

**Step 4: Add toggle handler**

```typescript
const handleToggleFilterPanel = useCallback(() => {
  setFilterPanelOpen(workspaceId, !isFilterPanelOpen);
}, [workspaceId, isFilterPanelOpen, setFilterPanelOpen]);
```

**Step 5: Update the render JSX**

Wrap the existing return in a flex column to add the toolbar above the graph. Replace the current return block (after the loading/error/not-found guards) with:

```tsx
return (
  <div className="flex h-full flex-col">
    <WorkspaceToolbarComponent
      hiddenCount={hiddenFilterCount}
      isFilterPanelOpen={isFilterPanelOpen}
      onToggleFilterPanel={handleToggleFilterPanel}
    />
    <div className="relative min-h-0 flex-1">
      <WorkspaceGraphComponent
        workspace={filteredWorkspace!}
        entityMap={filteredEntityMap}
        selectedEntityIds={selectedEntityIds}
        onSetSelectedEntityIds={handleSetSelectedEntityIds}
        onToggleEntitySelection={handleToggleEntitySelection}
        onClearEntitySelection={handleClearEntitySelection}
        onSaveViewState={handleSaveViewState}
        onAddEntity={handleAddEntity}
        onContextMenu={handleContextMenu}
        onFocusPanel={handleFocusPanel}
        openPopups={openPopups}
        onOpenPopup={popup => openPopup(workspaceId, popup)}
        onClosePopup={popupId => closePopup(workspaceId, popupId)}
        onUpdatePopupPosition={(popupId, svgX, svgY) => updatePopupPosition(workspaceId, popupId, svgX, svgY)}
        previewState={previewState}
        onAltClick={handleAltClick}
        onPreviewAddEntity={(entityId, position) => {
          const entity = previewState?.nodes.find(e => e.id === entityId);
          if (entity) handlePreviewAddEntity(entity, position);
        }}
        onPreviewGroupClick={handlePreviewGroupClick}
      />
      {isFilterPanelOpen && (
        <WorkspaceFilterPanelComponent
          entityTypes={entityTypes}
          predicates={predicates}
          hiddenEntityTypes={hiddenEntityTypes}
          hiddenPredicates={hiddenPredicates}
          onToggleEntityType={type => toggleEntityTypeVisibility(workspaceId, type)}
          onTogglePredicate={predicate => togglePredicateVisibility(workspaceId, predicate)}
          onReset={() => resetFilters(workspaceId)}
          onClose={() => setFilterPanelOpen(workspaceId, false)}
        />
      )}
      <WorkspaceContextMenuComponent
        position={contextMenuPosition}
        onClose={handleContextMenuClose}
        selectedEntityCount={selectedEntityIds.length}
        onDelete={handleDeleteClick}
      />
      <DeleteEntitiesDialogComponent
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        entityCount={selectedEntityIds.length}
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
      {previewPopup && (
        <GraphPreviewPopupComponent
          entityType={previewPopup.group.entityType}
          entities={previewPopup.group.entities}
          entitiesInGraph={new Set(filteredEntityMap.keys())}
          x={previewPopup.position.x}
          y={previewPopup.position.y}
          onAdd={handlePreviewPopupAdd}
          onClose={handlePreviewPopupClose}
          onDragEnd={handlePreviewPopupDragEnd}
        />
      )}
    </div>
  </div>
);
```

Key changes to note:
- Outer `div` with `flex flex-col h-full` wraps toolbar + graph area
- Graph area wrapped in `div` with `relative flex-1 min-h-0`
- `workspace` prop replaced with `filteredWorkspace!`
- `entityMap` prop replaced with `filteredEntityMap`
- `entitiesInGraph` on preview popup uses `filteredEntityMap`
- Filter panel is positioned `absolute` inside the graph area
- Context menu, delete dialog, preview popup unchanged but moved inside graph area wrapper

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Manual test**

1. Open a .ws workspace file
2. Verify toolbar appears above the graph
3. Click "Filter" button — panel should open on the right
4. Toggle an entity type eye icon — nodes of that type should disappear
5. Toggle a predicate eye icon — links with that predicate should disappear
6. Badge should show count of hidden items
7. "Reset All" should restore everything
8. Panel should not overlap minimap

**Step 8: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "feat(workspace): wire up toolbar, filter panel, and data filtering"
```

---

### Task 6: Verify and Fix Lint

**Step 1: Run lint**

Run: `npm run lint`

**Step 2: Fix any lint issues**

Address any issues found.

**Step 3: Final build check**

Run: `npm run build`
Expected: Build succeeds with no warnings

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(workspace): lint fixes for graph filter feature"
```
