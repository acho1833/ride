# Entity Delete Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement entity delete functionality with a unified context menu system that adapts based on right-click target.

**Architecture:** Move context menu from `workspace-graph.component.tsx` to `workspace.component.tsx`. Create separate components for context menu and delete confirmation dialog. Use optimistic updates for immediate UI feedback on delete.

**Tech Stack:** React, Shadcn AlertDialog/ContextMenu, React Query mutations, Zustand selection state

---

## Task 1: Create Delete Mutation Hook

**Files:**
- Create: `src/features/workspace/hooks/useWorkspaceRemoveEntitiesMutation.ts`

**Step 1: Create the mutation hook file**

```typescript
/**
 * Workspace Remove Entities Mutation Hook
 *
 * Removes entities from a workspace with optimistic updates.
 * Entities disappear immediately; reappear if API fails.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';
import type { Workspace } from '@/models/workspace.model';

/**
 * Hook for removing entities from a workspace
 * @returns Mutation object with mutate function
 */
export const useWorkspaceRemoveEntitiesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspace.removeEntities.mutationOptions({
      onMutate: variables => {
        const toastId = toast.loading('Deleting...');
        const queryKey = orpc.workspace.getById.key({ input: { id: variables.workspaceId } });

        // Snapshot for rollback, then optimistically remove entities
        const previousWorkspace = queryClient.getQueryData<Workspace>(queryKey);
        queryClient.setQueryData<Workspace>(queryKey, old =>
          old
            ? {
                ...old,
                entityList: old.entityList.filter(e => !variables.entityIds.includes(e.id)),
                relationshipList: old.relationshipList.filter(
                  r => !variables.entityIds.includes(r.sourceId) && !variables.entityIds.includes(r.targetId)
                )
              }
            : old
        );

        return { toastId, previousWorkspace };
      },
      onSuccess: async (_data, variables, context) => {
        toast.success('Entities deleted', { id: context?.toastId });
      },
      onError: (_error, variables, context) => {
        // Rollback on error
        if (context?.previousWorkspace) {
          queryClient.setQueryData(
            orpc.workspace.getById.key({ input: { id: variables.workspaceId } }),
            context.previousWorkspace
          );
        }
        toast.error('Failed to delete entities', { id: context?.toastId });
      }
    })
  );
};
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors related to the new hook file

**Step 3: Commit**

```bash
git add src/features/workspace/hooks/useWorkspaceRemoveEntitiesMutation.ts
git commit -m "feat: add useWorkspaceRemoveEntitiesMutation hook with optimistic updates"
```

---

## Task 2: Create Delete Entities Dialog Component

**Files:**
- Create: `src/features/workspace/components/delete-entities-dialog.component.tsx`

**Step 1: Create the dialog component**

```typescript
'use client';

/**
 * Delete Entities Dialog Component
 *
 * Confirmation dialog for deleting entities from workspace.
 * Shows count of entities to be deleted.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityCount: number;
  onConfirm: () => void;
  isPending: boolean;
}

const DeleteEntitiesDialogComponent = ({ open, onOpenChange, entityCount, onConfirm, isPending }: Props) => {
  const title = entityCount === 1 ? 'Delete entity?' : 'Delete entities?';
  const description =
    entityCount === 1
      ? 'This will remove 1 entity from this workspace.'
      : `This will remove ${entityCount} entities from this workspace.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEntitiesDialogComponent;
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors related to the new dialog component

**Step 3: Commit**

```bash
git add src/features/workspace/components/delete-entities-dialog.component.tsx
git commit -m "feat: add DeleteEntitiesDialogComponent for delete confirmation"
```

---

## Task 3: Create Workspace Context Menu Component

**Files:**
- Create: `src/features/workspace/components/workspace-context-menu.component.tsx`

**Step 1: Create the context menu component**

```typescript
'use client';

/**
 * Workspace Context Menu Component
 *
 * Unified context menu for workspace graph.
 * Shows different options based on selection state.
 */

import { useRef, useEffect } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { Copy, ClipboardPaste, Trash2, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** Position to show menu at, null when closed */
  position: { x: number; y: number } | null;
  /** Called when menu closes */
  onClose: () => void;
  /** Number of selected entities */
  selectedCount: number;
  /** Called when delete is clicked */
  onDelete: () => void;
}

const WorkspaceContextMenuComponent = ({ position, onClose, selectedCount, onDelete }: Props) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  // Open context menu when position changes
  useEffect(() => {
    if (position && triggerRef.current) {
      const openMenu = () => {
        triggerRef.current?.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            clientX: position.x,
            clientY: position.y
          })
        );
      };

      // If menu is already open, close it first then reopen
      if (openRef.current) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        setTimeout(openMenu, 150);
      } else {
        openMenu();
      }
    }
  }, [position]);

  const handleOpenChange = (open: boolean) => {
    openRef.current = open;
    if (!open) {
      onClose();
    }
  };

  const handleCopy = () => {
    toast.info('Copy: Not implemented');
  };

  const handlePaste = () => {
    toast.info('Paste: Not implemented');
  };

  const handleSpreadline = () => {
    toast.info('Analytics > Spreadline: Not implemented');
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>
        <div ref={triggerRef} className="pointer-events-none fixed h-1 w-1" style={{ left: position?.x ?? 0, top: position?.y ?? 0 }} />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleCopy} disabled>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste} disabled>
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Paste
        </ContextMenuItem>
        <ContextMenuSeparator />
        {selectedCount > 0 && (
          <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        )}
        {selectedCount > 0 && <ContextMenuSeparator />}
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            <ContextMenuItem onClick={handleSpreadline} disabled>
              <TrendingUp className="mr-2 h-4 w-4" />
              Spreadline
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default WorkspaceContextMenuComponent;
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors related to the new context menu component

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace-context-menu.component.tsx
git commit -m "feat: add WorkspaceContextMenuComponent for unified context menu"
```

---

## Task 4: Modify Workspace Graph Component

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Add onContextMenu prop to interface**

In `workspace-graph.component.tsx`, add to the `Props` interface (around line 77-91):

```typescript
interface Props {
  workspace: Workspace;
  /** Map of entity IDs to entities for O(1) lookups */
  entityMap: Map<string, Entity>;
  /** IDs of currently selected entity nodes (from Zustand store) */
  selectedEntityIds: string[];
  /** Replace the entire selection with the given IDs */
  onSetSelectedEntityIds: (ids: string[]) => void;
  /** Toggle a single entity in/out of the selection */
  onToggleEntitySelection: (id: string) => void;
  /** Clear all selected entities */
  onClearEntitySelection: () => void;
  onSaveViewState: (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => void;
  onAddEntity: (entityId: string, position: { x: number; y: number }) => void;
  /** Called when user right-clicks on graph (entity or canvas) */
  onContextMenu: (event: MouseEvent, entityId?: string) => void;
}
```

**Step 2: Destructure the new prop**

Update the component function signature (around line 93-102):

```typescript
const WorkspaceGraphComponent = ({
  workspace,
  entityMap,
  selectedEntityIds = [],
  onSetSelectedEntityIds,
  onToggleEntitySelection,
  onClearEntitySelection,
  onSaveViewState,
  onAddEntity,
  onContextMenu
}: Props) => {
```

**Step 3: Remove context menu state and handlers**

Delete these lines:
- Line 109: `const [contextMenuNode, setContextMenuNode] = useState<WorkspaceGraphNode | null>(null);`
- Line 110: `const contextMenuOpenRef = useRef(false);`
- Line 111: `const contextMenuTriggerRef = useRef<HTMLDivElement>(null);`
- Line 112: `const handleNodeContextMenuRef = useRef<...>(...);`
- Lines 452-467: `handleCopy`, `handlePaste`, `handleDelete`, `handleSpreadline` callbacks
- Lines 513-551: `handleNodeContextMenuRef.current = ...` function

**Step 4: Remove context menu imports**

Remove from imports (lines 14-23):
- `ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuTrigger`
- `Copy`, `ClipboardPaste`, `Trash2`, `BarChart3`, `TrendingUp`
- `toast`

Updated imports:

```typescript
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { debounce } from 'lodash-es';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Maximize } from 'lucide-react';
import { toast } from 'sonner';
import { GRAPH_CONFIG } from '../const';
```

Note: Keep `toast` import - it's used in `handleDrop`.

**Step 5: Update node contextmenu handler**

Replace the node contextmenu handler (around line 406-408) to call the prop:

```typescript
// Add right-click handler for context menu
node.on('contextmenu', function (event: MouseEvent, d: WorkspaceGraphNode) {
  event.preventDefault();
  onContextMenu(event, d.id);
});
```

**Step 6: Add SVG contextmenu handler for canvas right-click**

After the existing `svg.on('click', ...)` handler (around line 411-413), add:

```typescript
// Right-click on empty canvas: open context menu without changing selection
svg.on('contextmenu', function (event: MouseEvent) {
  event.preventDefault();
  onContextMenu(event);
});
```

**Step 7: Remove context menu JSX**

Delete the entire context menu JSX block (lines 557-590):

```typescript
{/* Context menu for nodes */}
<ContextMenu onOpenChange={open => (contextMenuOpenRef.current = open)}>
  ...
</ContextMenu>
```

**Step 8: Verify TypeScript compiles**

Run: `npm run build`
Expected: Error about missing `onContextMenu` prop in `workspace.component.tsx` - this is expected

**Step 9: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "refactor: move context menu out of WorkspaceGraphComponent"
```

---

## Task 5: Modify Workspace Component

**Files:**
- Modify: `src/features/workspace/components/workspace.component.tsx`

**Step 1: Add imports**

Add to imports section:

```typescript
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useWorkspaceRemoveEntitiesMutation } from '../hooks/useWorkspaceRemoveEntitiesMutation';
import WorkspaceContextMenuComponent from './workspace-context-menu.component';
import DeleteEntitiesDialogComponent from './delete-entities-dialog.component';
```

**Step 2: Add state and mutation**

After existing hooks (around line 29), add:

```typescript
const { mutate: removeEntities, isPending: isDeleting } = useWorkspaceRemoveEntitiesMutation();
const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

**Step 3: Add context menu handler**

After `handleAddEntity` callback (around line 70), add:

```typescript
const handleContextMenu = useCallback(
  (event: MouseEvent, entityId?: string) => {
    // If right-clicked on entity, single-select it
    if (entityId) {
      setSelectedEntityIds(workspaceId, [entityId]);
    }
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  },
  [workspaceId, setSelectedEntityIds]
);

const handleContextMenuClose = useCallback(() => {
  setContextMenuPosition(null);
}, []);

const handleDeleteClick = useCallback(() => {
  setDeleteDialogOpen(true);
}, []);

const handleDeleteConfirm = useCallback(() => {
  removeEntities(
    { workspaceId, entityIds: selectedEntityIds },
    {
      onSuccess: () => {
        clearEntitySelection(workspaceId);
        setDeleteDialogOpen(false);
      }
    }
  );
}, [workspaceId, selectedEntityIds, removeEntities, clearEntitySelection]);
```

**Step 4: Add onContextMenu prop to WorkspaceGraphComponent**

Update the return JSX (around line 97-106):

```typescript
return (
  <>
    <WorkspaceGraphComponent
      workspace={workspace}
      entityMap={entityMap}
      selectedEntityIds={selectedEntityIds}
      onSetSelectedEntityIds={ids => setSelectedEntityIds(workspaceId, ids)}
      onToggleEntitySelection={id => toggleEntitySelection(workspaceId, id)}
      onClearEntitySelection={() => clearEntitySelection(workspaceId)}
      onSaveViewState={handleSaveViewState}
      onAddEntity={handleAddEntity}
      onContextMenu={handleContextMenu}
    />
    <WorkspaceContextMenuComponent
      position={contextMenuPosition}
      onClose={handleContextMenuClose}
      selectedCount={selectedEntityIds.length}
      onDelete={handleDeleteClick}
    />
    <DeleteEntitiesDialogComponent
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      entityCount={selectedEntityIds.length}
      onConfirm={handleDeleteConfirm}
      isPending={isDeleting}
    />
  </>
);
```

**Step 5: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors

**Step 6: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "feat: integrate context menu and delete dialog in WorkspaceComponent"
```

---

## Task 6: Manual Testing

**Step 1: Start the dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Test single entity delete**

1. Navigate to a workspace with entities
2. Right-click on an entity node
3. Verify that entity becomes selected (highlighted)
4. Click "Delete" in context menu
5. Verify dialog shows "Delete entity?" with count of 1
6. Click "Delete" to confirm
7. Verify entity disappears immediately (optimistic update)
8. Verify toast shows "Entities deleted"

**Step 3: Test multi-select delete via canvas**

1. Ctrl+click to select multiple entities
2. Right-click on empty canvas
3. Click "Delete" in context menu
4. Verify dialog shows correct count (e.g., "Delete 3 entities?")
5. Confirm deletion
6. Verify all selected entities are removed immediately

**Step 4: Test right-click on entity resets selection**

1. Ctrl+click to select multiple entities (e.g., 3)
2. Right-click on any entity (selected or not)
3. Verify selection changes to only that one entity
4. Verify delete dialog shows count of 1

**Step 5: Test right-click on canvas with no selection**

1. Clear selection by clicking empty canvas
2. Right-click on empty canvas
3. Verify "Delete" option is hidden

**Step 6: Test cancel**

1. Open delete dialog
2. Click "Cancel"
3. Verify nothing is deleted
4. Verify selection is preserved

**Step 7: Commit final changes (if any adjustments were needed)**

```bash
git add -A
git commit -m "fix: adjustments from manual testing"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | Create `useWorkspaceRemoveEntitiesMutation.ts` | Mutation hook with optimistic updates |
| 2 | Create `delete-entities-dialog.component.tsx` | Confirmation dialog |
| 3 | Create `workspace-context-menu.component.tsx` | Unified context menu |
| 4 | Modify `workspace-graph.component.tsx` | Remove context menu, add onContextMenu prop |
| 5 | Modify `workspace.component.tsx` | Integrate menu, dialog, and delete flow |
| 6 | Manual testing | Verify all scenarios work |
