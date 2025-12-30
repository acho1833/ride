# Editor Split Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the editor from a fixed 2-group (left/right) layout to a dynamic VSCode-style split system with unlimited horizontal groups, 2 vertical rows, drag-and-drop tab reordering, and context-aware move menus.

**Architecture:** Replace the hardcoded `left`/`right` group structure with a `rows[]` array containing `groups[]` arrays. Each group has a unique ID. Components render dynamically based on this structure. dnd-kit handles all drag-and-drop interactions.

**Tech Stack:** React, Zustand, dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`), Shadcn ResizablePanel

---

## Task 1: Install dnd-kit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Verify installation**

Run:
```bash
npm ls @dnd-kit/core
```
Expected: Shows `@dnd-kit/core` version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dnd-kit dependencies for editor drag-and-drop"
```

---

## Task 2: Create Editor Constants

**Files:**
- Create: `src/features/editor/const.ts`

**Step 1: Create constants file**

```typescript
// src/features/editor/const.ts

/**
 * Editor configuration constants
 */
export const EDITOR_CONFIG = {
  /** Max vertical rows (2 = top/bottom only, -1 = unlimited) */
  yGroupLimit: 2,
  /** Max horizontal groups per row (-1 = unlimited) */
  xGroupLimit: -1,
} as const;

/** Drop zone identifiers */
export const DROP_ZONES = {
  CENTER: 'center',
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
} as const;

export type DropZone = (typeof DROP_ZONES)[keyof typeof DROP_ZONES];

/** Direction for moving files */
export type MoveDirection = 'left' | 'right' | 'up' | 'down';
```

**Step 2: Commit**

```bash
git add src/features/editor/const.ts
git commit -m "feat(editor): add configuration constants"
```

---

## Task 3: Rewrite Open Files Store - Types and Initial State

**Files:**
- Modify: `src/stores/open-files/open-files.store.ts`

**Step 1: Replace types section (lines 1-60)**

Replace the entire types and initial state section with:

```typescript
/**
 * Open Files State Store
 *
 * Zustand slice for managing open files in dynamic editor groups.
 * Supports multiple rows (vertical) and unlimited groups per row (horizontal).
 */

import { StateCreator } from 'zustand';
import { EDITOR_CONFIG, MoveDirection } from '@/features/editor/const';

// ============================================================================
// Types
// ============================================================================

/** Unique group identifier */
export type GroupId = string;

/** Unique row identifier */
export type RowId = string;

/** Open file metadata */
export type OpenFile = {
  id: string;
  name: string;
};

/** Editor group with ordered tabs */
export type EditorGroup = {
  id: GroupId;
  files: OpenFile[];
  activeFileId: string | null;
};

/** Row containing horizontally arranged groups */
export type EditorRow = {
  id: RowId;
  groups: EditorGroup[];
};

/** Open files state interface */
export interface OpenFilesState {
  openFiles: {
    rows: EditorRow[];
    lastFocusedGroupId: GroupId | null;
  };
}

/** Open files action methods */
export interface OpenFilesActions {
  // File operations
  openFile: (fileId: string, name: string, groupId?: GroupId) => void;
  closeFile: (fileId: string, groupId: GroupId) => void;
  setActiveFile: (fileId: string, groupId: GroupId) => void;
  closeAllFilesInGroup: (groupId: GroupId) => void;

  // Move operations
  moveFileToGroup: (fileId: string, fromGroupId: GroupId, toGroupId: GroupId, insertIndex?: number) => void;
  moveFileToNewGroup: (fileId: string, fromGroupId: GroupId, direction: MoveDirection) => void;

  // Tab reordering
  reorderFile: (fileId: string, groupId: GroupId, newIndex: number) => void;

  // Focus
  setLastFocusedGroup: (groupId: GroupId) => void;
}

/** Combined open files store type */
export type OpenFilesSlice = OpenFilesState & OpenFilesActions;

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate unique ID */
const generateId = (): string => crypto.randomUUID();

/** Create empty group */
const createGroup = (id?: string): EditorGroup => ({
  id: id ?? generateId(),
  files: [],
  activeFileId: null,
});

/** Create row with one empty group */
const createRow = (id?: string): EditorRow => ({
  id: id ?? generateId(),
  groups: [createGroup()],
});

/** Find group and row by group ID */
const findGroupLocation = (
  rows: EditorRow[],
  groupId: GroupId
): { rowIndex: number; groupIndex: number; group: EditorGroup; row: EditorRow } | null => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const groupIndex = row.groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
      return { rowIndex, groupIndex, group: row.groups[groupIndex], row };
    }
  }
  return null;
};

/** Find group containing a file */
const findGroupContainingFile = (
  rows: EditorRow[],
  fileId: string
): { rowIndex: number; groupIndex: number; group: EditorGroup } | null => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    for (let groupIndex = 0; groupIndex < row.groups.length; groupIndex++) {
      const group = row.groups[groupIndex];
      if (group.files.some(f => f.id === fileId)) {
        return { rowIndex, groupIndex, group };
      }
    }
  }
  return null;
};

/** Remove empty groups and rows, returns cleaned rows */
const cleanupEmptyGroupsAndRows = (rows: EditorRow[]): EditorRow[] => {
  // Filter out empty groups from each row
  const cleanedRows = rows.map(row => ({
    ...row,
    groups: row.groups.filter(g => g.files.length > 0),
  }));

  // Filter out empty rows
  const nonEmptyRows = cleanedRows.filter(row => row.groups.length > 0);

  // Always keep at least one row with one group
  if (nonEmptyRows.length === 0) {
    return [createRow()];
  }

  return nonEmptyRows;
};

// ============================================================================
// Initial State
// ============================================================================

const initialGroupId = generateId();

const initialState: OpenFilesState['openFiles'] = {
  rows: [
    {
      id: generateId(),
      groups: [
        {
          id: initialGroupId,
          files: [{ id: 'id3', name: 'sample3.ws' }],
          activeFileId: 'id3',
        },
      ],
    },
  ],
  lastFocusedGroupId: initialGroupId,
};
```

**Step 2: Commit partial progress**

```bash
git add src/stores/open-files/open-files.store.ts
git commit -m "feat(store): update open-files types for dynamic groups"
```

---

## Task 4: Rewrite Open Files Store - Actions

**Files:**
- Modify: `src/stores/open-files/open-files.store.ts`

**Step 1: Replace slice creator with new actions**

Add after the initial state section:

```typescript
// ============================================================================
// Slice Creator
// ============================================================================

export const createOpenFilesSlice: StateCreator<OpenFilesSlice, [], [], OpenFilesSlice> = set => ({
  openFiles: initialState,

  // Open file in group (or last focused, or first available)
  openFile: (fileId: string, name: string, groupId?: GroupId) =>
    set(state => {
      const { rows, lastFocusedGroupId } = state.openFiles;

      // Check if file already exists anywhere
      const existing = findGroupContainingFile(rows, fileId);
      if (existing) {
        // Activate existing file
        const newRows = rows.map((row, ri) =>
          ri === existing.rowIndex
            ? {
                ...row,
                groups: row.groups.map((g, gi) =>
                  gi === existing.groupIndex ? { ...g, activeFileId: fileId } : g
                ),
              }
            : row
        );
        return {
          openFiles: {
            rows: newRows,
            lastFocusedGroupId: existing.group.id,
          },
        };
      }

      // Determine target group
      const targetGroupId = groupId ?? lastFocusedGroupId ?? rows[0]?.groups[0]?.id;
      if (!targetGroupId) return state;

      const location = findGroupLocation(rows, targetGroupId);
      if (!location) return state;

      // Add file to end of target group
      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) =>
                gi === location.groupIndex
                  ? {
                      ...g,
                      files: [...g.files, { id: fileId, name }],
                      activeFileId: fileId,
                    }
                  : g
              ),
            }
          : row
      );

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: targetGroupId,
        },
      };
    }),

  // Close file from specific group
  closeFile: (fileId: string, groupId: GroupId) =>
    set(state => {
      const { rows } = state.openFiles;
      const location = findGroupLocation(rows, groupId);
      if (!location) return state;

      const { group } = location;
      const fileIndex = group.files.findIndex(f => f.id === fileId);
      if (fileIndex === -1) return state;

      const newFiles = group.files.filter(f => f.id !== fileId);
      let newActiveFileId = group.activeFileId;

      // If closing active file, select next/prev
      if (group.activeFileId === fileId) {
        if (newFiles.length > 0) {
          const nextIndex = Math.min(fileIndex, newFiles.length - 1);
          newActiveFileId = newFiles[nextIndex].id;
        } else {
          newActiveFileId = null;
        }
      }

      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) =>
                gi === location.groupIndex
                  ? { ...g, files: newFiles, activeFileId: newActiveFileId }
                  : g
              ),
            }
          : row
      );

      // Cleanup empty groups/rows
      const cleanedRows = cleanupEmptyGroupsAndRows(newRows);

      // Update lastFocusedGroupId if needed
      let newLastFocusedGroupId = state.openFiles.lastFocusedGroupId;
      if (newLastFocusedGroupId === groupId && newFiles.length === 0) {
        // Group was removed, focus first available
        newLastFocusedGroupId = cleanedRows[0]?.groups[0]?.id ?? null;
      }

      return {
        openFiles: {
          rows: cleanedRows,
          lastFocusedGroupId: newLastFocusedGroupId,
        },
      };
    }),

  // Set active file in group
  setActiveFile: (fileId: string, groupId: GroupId) =>
    set(state => {
      const { rows } = state.openFiles;
      const location = findGroupLocation(rows, groupId);
      if (!location) return state;

      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) =>
                gi === location.groupIndex ? { ...g, activeFileId: fileId } : g
              ),
            }
          : row
      );

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: groupId,
        },
      };
    }),

  // Close all files in group
  closeAllFilesInGroup: (groupId: GroupId) =>
    set(state => {
      const { rows } = state.openFiles;
      const location = findGroupLocation(rows, groupId);
      if (!location) return state;

      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) =>
                gi === location.groupIndex ? { ...g, files: [], activeFileId: null } : g
              ),
            }
          : row
      );

      const cleanedRows = cleanupEmptyGroupsAndRows(newRows);
      const newLastFocusedGroupId = cleanedRows[0]?.groups[0]?.id ?? null;

      return {
        openFiles: {
          rows: cleanedRows,
          lastFocusedGroupId: newLastFocusedGroupId,
        },
      };
    }),

  // Move file to existing group
  moveFileToGroup: (fileId: string, fromGroupId: GroupId, toGroupId: GroupId, insertIndex?: number) =>
    set(state => {
      if (fromGroupId === toGroupId) return state;

      const { rows } = state.openFiles;
      const fromLocation = findGroupLocation(rows, fromGroupId);
      const toLocation = findGroupLocation(rows, toGroupId);
      if (!fromLocation || !toLocation) return state;

      const file = fromLocation.group.files.find(f => f.id === fileId);
      if (!file) return state;

      // Can't move if it would leave source empty (unless moving last file)
      // Actually we CAN move the last file - group will be cleaned up

      // Remove from source
      const newFromFiles = fromLocation.group.files.filter(f => f.id !== fileId);
      let newFromActiveId = fromLocation.group.activeFileId;
      if (fromLocation.group.activeFileId === fileId) {
        newFromActiveId = newFromFiles.length > 0 ? newFromFiles[0].id : null;
      }

      // Add to target at specified index or end
      const targetFiles = [...toLocation.group.files];
      const idx = insertIndex ?? targetFiles.length;
      targetFiles.splice(idx, 0, file);

      // Build new rows
      let newRows = rows.map((row, ri) => {
        if (ri === fromLocation.rowIndex && ri === toLocation.rowIndex) {
          // Same row
          return {
            ...row,
            groups: row.groups.map((g, gi) => {
              if (gi === fromLocation.groupIndex) {
                return { ...g, files: newFromFiles, activeFileId: newFromActiveId };
              }
              if (gi === toLocation.groupIndex) {
                return { ...g, files: targetFiles, activeFileId: fileId };
              }
              return g;
            }),
          };
        }
        if (ri === fromLocation.rowIndex) {
          return {
            ...row,
            groups: row.groups.map((g, gi) =>
              gi === fromLocation.groupIndex
                ? { ...g, files: newFromFiles, activeFileId: newFromActiveId }
                : g
            ),
          };
        }
        if (ri === toLocation.rowIndex) {
          return {
            ...row,
            groups: row.groups.map((g, gi) =>
              gi === toLocation.groupIndex ? { ...g, files: targetFiles, activeFileId: fileId } : g
            ),
          };
        }
        return row;
      });

      newRows = cleanupEmptyGroupsAndRows(newRows);

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: toGroupId,
        },
      };
    }),

  // Move file to new group in direction
  moveFileToNewGroup: (fileId: string, fromGroupId: GroupId, direction: MoveDirection) =>
    set(state => {
      const { rows } = state.openFiles;
      const fromLocation = findGroupLocation(rows, fromGroupId);
      if (!fromLocation) return state;

      const file = fromLocation.group.files.find(f => f.id === fileId);
      if (!file) return state;

      // Can't move if only 1 file in group
      if (fromLocation.group.files.length < 2) return state;

      const { yGroupLimit, xGroupLimit } = EDITOR_CONFIG;

      // Remove file from source
      const newFromFiles = fromLocation.group.files.filter(f => f.id !== fileId);
      let newFromActiveId = fromLocation.group.activeFileId;
      if (fromLocation.group.activeFileId === fileId) {
        newFromActiveId = newFromFiles.length > 0 ? newFromFiles[0].id : null;
      }

      // Create new group with the file
      const newGroup: EditorGroup = {
        id: generateId(),
        files: [file],
        activeFileId: fileId,
      };

      let newRows = [...rows];

      if (direction === 'left' || direction === 'right') {
        // Check xGroupLimit
        const currentRow = rows[fromLocation.rowIndex];
        if (xGroupLimit !== -1 && currentRow.groups.length >= xGroupLimit) {
          return state;
        }

        // Insert new group in same row
        const insertIdx = direction === 'left' ? fromLocation.groupIndex : fromLocation.groupIndex + 1;
        const newGroups = [...currentRow.groups];

        // Update source group first
        newGroups[fromLocation.groupIndex] = {
          ...fromLocation.group,
          files: newFromFiles,
          activeFileId: newFromActiveId,
        };

        // Insert new group
        newGroups.splice(insertIdx, 0, newGroup);

        newRows[fromLocation.rowIndex] = { ...currentRow, groups: newGroups };
      } else {
        // up or down
        const targetRowIndex = direction === 'up' ? 0 : 1;
        const isCreatingNewRow = rows.length < 2 || (direction === 'up' && fromLocation.rowIndex === 0) || (direction === 'down' && fromLocation.rowIndex === rows.length - 1);

        if (isCreatingNewRow) {
          // Check yGroupLimit
          if (yGroupLimit !== -1 && rows.length >= yGroupLimit) {
            return state;
          }

          // Update source group
          newRows = newRows.map((row, ri) =>
            ri === fromLocation.rowIndex
              ? {
                  ...row,
                  groups: row.groups.map((g, gi) =>
                    gi === fromLocation.groupIndex
                      ? { ...g, files: newFromFiles, activeFileId: newFromActiveId }
                      : g
                  ),
                }
              : row
          );

          // Create new row
          const newRow: EditorRow = {
            id: generateId(),
            groups: [newGroup],
          };

          if (direction === 'up') {
            newRows = [newRow, ...newRows];
          } else {
            newRows = [...newRows, newRow];
          }
        } else {
          // Move to existing row
          const existingTargetRow = rows[targetRowIndex];

          // Update source group
          newRows = newRows.map((row, ri) =>
            ri === fromLocation.rowIndex
              ? {
                  ...row,
                  groups: row.groups.map((g, gi) =>
                    gi === fromLocation.groupIndex
                      ? { ...g, files: newFromFiles, activeFileId: newFromActiveId }
                      : g
                  ),
                }
              : row
          );

          // Add group to target row
          newRows[targetRowIndex] = {
            ...existingTargetRow,
            groups: [...existingTargetRow.groups, newGroup],
          };
        }
      }

      newRows = cleanupEmptyGroupsAndRows(newRows);

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: newGroup.id,
        },
      };
    }),

  // Reorder file within same group
  reorderFile: (fileId: string, groupId: GroupId, newIndex: number) =>
    set(state => {
      const { rows } = state.openFiles;
      const location = findGroupLocation(rows, groupId);
      if (!location) return state;

      const { group } = location;
      const currentIndex = group.files.findIndex(f => f.id === fileId);
      if (currentIndex === -1 || currentIndex === newIndex) return state;

      const newFiles = [...group.files];
      const [movedFile] = newFiles.splice(currentIndex, 1);
      newFiles.splice(newIndex, 0, movedFile);

      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) =>
                gi === location.groupIndex ? { ...g, files: newFiles } : g
              ),
            }
          : row
      );

      return {
        openFiles: {
          ...state.openFiles,
          rows: newRows,
        },
      };
    }),

  // Set last focused group
  setLastFocusedGroup: (groupId: GroupId) =>
    set(state => ({
      openFiles: {
        ...state.openFiles,
        lastFocusedGroupId: groupId,
      },
    })),
});
```

**Step 2: Commit**

```bash
git add src/stores/open-files/open-files.store.ts
git commit -m "feat(store): implement dynamic group actions"
```

---

## Task 5: Rewrite Open Files Selectors

**Files:**
- Modify: `src/stores/open-files/open-files.selector.ts`

**Step 1: Replace entire file**

```typescript
/**
 * Open Files Selectors
 *
 * Selector functions and hooks for open files state.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { OpenFilesSlice, EditorRow, EditorGroup, GroupId } from './open-files.store';

// ============================================================================
// Selector Hooks
// ============================================================================

/** Hook for all rows */
export const useEditorRows = () => useAppStore((state: OpenFilesSlice) => state.openFiles.rows);

/** Hook for last focused group ID */
export const useLastFocusedGroupId = () =>
  useAppStore((state: OpenFilesSlice) => state.openFiles.lastFocusedGroupId);

/** Hook for a specific group by ID */
export const useEditorGroup = (groupId: GroupId): EditorGroup | null =>
  useAppStore((state: OpenFilesSlice) => {
    for (const row of state.openFiles.rows) {
      const group = row.groups.find(g => g.id === groupId);
      if (group) return group;
    }
    return null;
  });

/** Hook to find which row a group belongs to */
export const useGroupRowIndex = (groupId: GroupId): number =>
  useAppStore((state: OpenFilesSlice) => {
    for (let i = 0; i < state.openFiles.rows.length; i++) {
      if (state.openFiles.rows[i].groups.some(g => g.id === groupId)) {
        return i;
      }
    }
    return -1;
  });

/** Hook to find group index within its row */
export const useGroupIndexInRow = (groupId: GroupId): number =>
  useAppStore((state: OpenFilesSlice) => {
    for (const row of state.openFiles.rows) {
      const index = row.groups.findIndex(g => g.id === groupId);
      if (index !== -1) return index;
    }
    return -1;
  });

/** Hook for total number of rows */
export const useRowCount = () => useAppStore((state: OpenFilesSlice) => state.openFiles.rows.length);

/** Hook for number of groups in a row */
export const useGroupCountInRow = (rowIndex: number): number =>
  useAppStore((state: OpenFilesSlice) => state.openFiles.rows[rowIndex]?.groups.length ?? 0);

/** Hook for open files actions */
export const useOpenFilesActions = () =>
  useAppStore(
    useShallow((state: OpenFilesSlice) => ({
      openFile: state.openFile,
      closeFile: state.closeFile,
      setActiveFile: state.setActiveFile,
      closeAllFilesInGroup: state.closeAllFilesInGroup,
      moveFileToGroup: state.moveFileToGroup,
      moveFileToNewGroup: state.moveFileToNewGroup,
      reorderFile: state.reorderFile,
      setLastFocusedGroup: state.setLastFocusedGroup,
    }))
  );

// ============================================================================
// Utility Selectors (for context menu logic)
// ============================================================================

/** Check if a group can move in a direction */
export const useCanMoveInDirection = (
  groupId: GroupId,
  direction: 'left' | 'right' | 'up' | 'down'
): { canMove: boolean; isNewGroup: boolean } =>
  useAppStore((state: OpenFilesSlice) => {
    const { rows } = state.openFiles;

    // Find group location
    let rowIndex = -1;
    let groupIndex = -1;
    let group: EditorGroup | null = null;

    for (let ri = 0; ri < rows.length; ri++) {
      const gi = rows[ri].groups.findIndex(g => g.id === groupId);
      if (gi !== -1) {
        rowIndex = ri;
        groupIndex = gi;
        group = rows[ri].groups[gi];
        break;
      }
    }

    if (!group || group.files.length < 2) {
      return { canMove: false, isNewGroup: false };
    }

    const row = rows[rowIndex];

    switch (direction) {
      case 'left':
        return {
          canMove: true,
          isNewGroup: groupIndex === 0,
        };
      case 'right':
        return {
          canMove: true,
          isNewGroup: groupIndex === row.groups.length - 1,
        };
      case 'up':
        return {
          canMove: rowIndex > 0 || rows.length < 2,
          isNewGroup: rowIndex === 0 || rows.length < 2,
        };
      case 'down':
        return {
          canMove: rowIndex < rows.length - 1 || rows.length < 2,
          isNewGroup: rowIndex === rows.length - 1 || rows.length < 2,
        };
      default:
        return { canMove: false, isNewGroup: false };
    }
  });
```

**Step 2: Commit**

```bash
git add src/stores/open-files/open-files.selector.ts
git commit -m "feat(store): rewrite selectors for dynamic groups"
```

---

## Task 6: Create Editor Row Component

**Files:**
- Create: `src/features/editor/components/editor-row.component.tsx`

**Step 1: Create the component**

```typescript
/**
 * Editor Row Component
 *
 * Renders a horizontal row of editor groups with resizable panels.
 */

'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { EditorRow } from '@/stores/open-files/open-files.store';
import EditorGroupComponent from '@/features/editor/components/editor-group.component';

interface Props {
  row: EditorRow;
  rowIndex: number;
}

const EditorRowComponent = ({ row, rowIndex }: Props) => {
  const { groups } = row;

  // Single group - no resizable needed
  if (groups.length === 1) {
    return (
      <div className="h-full w-full">
        <EditorGroupComponent groupId={groups[0].id} rowIndex={rowIndex} groupIndex={0} />
      </div>
    );
  }

  // Multiple groups - use resizable panels
  const defaultSize = 100 / groups.length;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      {groups.map((group, groupIndex) => (
        <div key={group.id} className="contents">
          {groupIndex > 0 && <ResizableHandle />}
          <ResizablePanel defaultSize={defaultSize} minSize={15}>
            <EditorGroupComponent groupId={group.id} rowIndex={rowIndex} groupIndex={groupIndex} />
          </ResizablePanel>
        </div>
      ))}
    </ResizablePanelGroup>
  );
};

export default EditorRowComponent;
```

**Step 2: Commit**

```bash
git add src/features/editor/components/editor-row.component.tsx
git commit -m "feat(editor): add EditorRowComponent for horizontal groups"
```

---

## Task 7: Rewrite Editor Layout Component

**Files:**
- Modify: `src/features/editor/components/editor-layout.component.tsx`

**Step 1: Replace entire file**

```typescript
/**
 * Editor Layout Component
 *
 * Main layout rendering rows vertically with resizable panels.
 */

'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useEditorRows } from '@/stores/open-files/open-files.selector';
import EditorRowComponent from '@/features/editor/components/editor-row.component';

const EditorLayoutComponent = () => {
  const rows = useEditorRows();

  // No rows - shouldn't happen but handle gracefully
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
        <p>No editor groups</p>
      </div>
    );
  }

  // Single row - no vertical resizing needed
  if (rows.length === 1) {
    return (
      <div className="h-full w-full">
        <EditorRowComponent row={rows[0]} rowIndex={0} />
      </div>
    );
  }

  // Multiple rows - use vertical resizable panels
  const defaultSize = 100 / rows.length;

  return (
    <ResizablePanelGroup direction="vertical" className="h-full w-full">
      {rows.map((row, rowIndex) => (
        <div key={row.id} className="contents">
          {rowIndex > 0 && <ResizableHandle />}
          <ResizablePanel defaultSize={defaultSize} minSize={15}>
            <EditorRowComponent row={row} rowIndex={rowIndex} />
          </ResizablePanel>
        </div>
      ))}
    </ResizablePanelGroup>
  );
};

export default EditorLayoutComponent;
```

**Step 2: Commit**

```bash
git add src/features/editor/components/editor-layout.component.tsx
git commit -m "feat(editor): rewrite layout for dynamic rows"
```

---

## Task 8: Update Editor Group Component

**Files:**
- Modify: `src/features/editor/components/editor-group.component.tsx`

**Step 1: Replace entire file**

```typescript
/**
 * Editor Group Component
 *
 * Single editor group containing tabs and content area.
 */

'use client';

import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import EditorTabsComponent from '@/features/editor/components/editor-tabs.component';
import EditorContentComponent from '@/features/editor/components/editor-content.component';

interface Props {
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorGroupComponent = ({ groupId, rowIndex, groupIndex }: Props) => {
  const group = useEditorGroup(groupId);
  const { setLastFocusedGroup } = useOpenFilesActions();

  if (!group) {
    return null;
  }

  const { files, activeFileId } = group;
  const activeFile = files.find(f => f.id === activeFileId);

  const handleFocus = () => {
    setLastFocusedGroup(groupId);
  };

  return (
    <div className="flex h-full flex-col" onFocus={handleFocus} onMouseDown={handleFocus}>
      {/* Tab bar */}
      <EditorTabsComponent groupId={groupId} rowIndex={rowIndex} groupIndex={groupIndex} />

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {activeFile ? (
          <EditorContentComponent fileId={activeFile.id} fileName={activeFile.name} />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <p>No file selected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorGroupComponent;
```

**Step 2: Commit**

```bash
git add src/features/editor/components/editor-group.component.tsx
git commit -m "feat(editor): update group component for dynamic IDs"
```

---

## Task 9: Update Editor Tabs Component

**Files:**
- Modify: `src/features/editor/components/editor-tabs.component.tsx`

**Step 1: Replace entire file**

```typescript
/**
 * Editor Tabs Component
 *
 * Tab bar with overflow handling and dropdown menu.
 */

'use client';

import React from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import EditorTabComponent from '@/features/editor/components/editor-tab.component';

interface Props {
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorTabsComponent = ({ groupId, rowIndex, groupIndex }: Props) => {
  const group = useEditorGroup(groupId);
  const { setActiveFile, closeAllFilesInGroup } = useOpenFilesActions();

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);

  const files = group?.files ?? [];
  const activeFileId = group?.activeFileId ?? null;

  // Check for overflow
  React.useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const isOverflowing = container.scrollWidth > container.clientWidth;
      setHasOverflow(isOverflowing);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [files]);

  if (files.length === 0) {
    return null;
  }

  const handleActivate = (fileId: string) => {
    setActiveFile(fileId, groupId);
  };

  const handleCloseAll = () => {
    closeAllFilesInGroup(groupId);
  };

  return (
    <div className="bg-muted/30 flex h-9 items-center border-b">
      {/* Tabs container with horizontal scroll */}
      <div ref={tabsContainerRef} className="scrollbar-none flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {files.map(file => (
          <EditorTabComponent
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            groupId={groupId}
            rowIndex={rowIndex}
            groupIndex={groupIndex}
          />
        ))}
      </div>

      {/* Overflow dropdown - shows all files */}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="border-border h-9 w-9 rounded-none border-l">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {files.map(file => (
              <DropdownMenuItem key={file.id} onClick={() => handleActivate(file.id)}>
                {file.id === activeFileId && <span className="mr-2">●</span>}
                {file.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Group menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCloseAll}>Close All Tabs</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EditorTabsComponent;
```

**Step 2: Commit**

```bash
git add src/features/editor/components/editor-tabs.component.tsx
git commit -m "feat(editor): update tabs component for dynamic groups"
```

---

## Task 10: Update Editor Tab Component with Dynamic Context Menu

**Files:**
- Modify: `src/features/editor/components/editor-tab.component.tsx`

**Step 1: Replace entire file**

```typescript
/**
 * Editor Tab Component
 *
 * Single tab with dynamic context menu based on available move directions.
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { OpenFile, GroupId } from '@/stores/open-files/open-files.store';
import { useOpenFilesActions, useCanMoveInDirection, useEditorGroup } from '@/stores/open-files/open-files.selector';
import { Button } from '@/components/ui/button';
import { MoveDirection } from '@/features/editor/const';

interface Props {
  file: OpenFile;
  isActive: boolean;
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorTabComponent = ({ file, isActive, groupId, rowIndex, groupIndex }: Props) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const { closeFile, setActiveFile, moveFileToNewGroup, moveFileToGroup } = useOpenFilesActions();
  const group = useEditorGroup(groupId);

  const canMoveLeft = useCanMoveInDirection(groupId, 'left');
  const canMoveRight = useCanMoveInDirection(groupId, 'right');
  const canMoveUp = useCanMoveInDirection(groupId, 'up');
  const canMoveDown = useCanMoveInDirection(groupId, 'down');

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeFile(file.id, groupId);
  };

  const handleActivate = () => {
    setActiveFile(file.id, groupId);
  };

  const handleMove = (direction: MoveDirection) => {
    moveFileToNewGroup(file.id, groupId, direction);
  };

  // Get menu label based on whether it creates a new group
  const getMoveLabel = (direction: MoveDirection, info: { canMove: boolean; isNewGroup: boolean }) => {
    const directionLabels: Record<MoveDirection, string> = {
      left: 'Left',
      right: 'Right',
      up: 'Up',
      down: 'Down',
    };

    if (info.isNewGroup) {
      return `Split and Move ${directionLabels[direction]}`;
    }
    return `Move ${directionLabels[direction]}`;
  };

  const hasAnyMoveOption = canMoveLeft.canMove || canMoveRight.canMove || canMoveUp.canMove || canMoveDown.canMove;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            'group border-border relative flex h-9 cursor-pointer items-center gap-2 border-r px-3 text-sm transition-colors',
            isActive ? 'bg-secondary text-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={handleActivate}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Active indicator */}
          {isActive && <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />}

          {/* File name */}
          <span className="truncate">{file.name}</span>

          {/* Close button - shows on hover or when active */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className={cn('h-5 w-5 opacity-0 transition-colors', (isHovered || isActive) && 'opacity-100')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => closeFile(file.id, groupId)}>Close Tab</ContextMenuItem>

        {hasAnyMoveOption && (
          <>
            <ContextMenuSeparator />
            {canMoveLeft.canMove && (
              <ContextMenuItem onClick={() => handleMove('left')}>
                {getMoveLabel('left', canMoveLeft)}
              </ContextMenuItem>
            )}
            {canMoveRight.canMove && (
              <ContextMenuItem onClick={() => handleMove('right')}>
                {getMoveLabel('right', canMoveRight)}
              </ContextMenuItem>
            )}
            {canMoveUp.canMove && (
              <ContextMenuItem onClick={() => handleMove('up')}>
                {getMoveLabel('up', canMoveUp)}
              </ContextMenuItem>
            )}
            {canMoveDown.canMove && (
              <ContextMenuItem onClick={() => handleMove('down')}>
                {getMoveLabel('down', canMoveDown)}
              </ContextMenuItem>
            )}
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => closeFile(file.id, groupId)}>Close All Tabs</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default EditorTabComponent;
```

**Step 2: Commit**

```bash
git add src/features/editor/components/editor-tab.component.tsx
git commit -m "feat(editor): add dynamic move menu to tabs"
```

---

## Task 11: Verify Build and Fix Any Errors

**Step 1: Run the build**

Run:
```bash
npm run build
```

**Step 2: Fix any TypeScript errors**

If errors occur, fix them based on the error messages.

**Step 3: Test in browser**

Run:
```bash
npm run dev
```

Test:
1. Open the app
2. Verify the editor loads with one tab
3. Open another file (should add to same group)
4. Right-click tab - verify context menu shows "Split and Move Right"
5. Click "Split and Move Right" - verify new group appears
6. Test all move directions

**Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(editor): resolve build errors"
```

---

## Task 12: Add Drag-and-Drop Context Provider

**Files:**
- Create: `src/features/editor/components/editor-dnd-context.component.tsx`

**Step 1: Create the DnD context wrapper**

```typescript
/**
 * Editor DnD Context Component
 *
 * Provides drag-and-drop context for tab reordering and moving between groups.
 */

'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface DragData {
  fileId: string;
  fileName: string;
  fromGroupId: string;
}

interface Props {
  children: React.ReactNode;
}

const EditorDndContextComponent = ({ children }: Props) => {
  const [activeData, setActiveData] = React.useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragData | undefined;
    if (data) {
      setActiveData(data);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveData(null);
    // Drag end handling will be added when we implement sortable tabs
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activeData && (
          <div className="bg-secondary border-border rounded border px-3 py-1 text-sm shadow-lg">
            {activeData.fileName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default EditorDndContextComponent;
```

**Step 2: Commit**

```bash
git add src/features/editor/components/editor-dnd-context.component.tsx
git commit -m "feat(editor): add DnD context provider"
```

---

## Task 13: Integrate DnD Context into Layout

**Files:**
- Find where `EditorLayoutComponent` is used and wrap it with `EditorDndContextComponent`

**Step 1: Find usage**

Search for where `EditorLayoutComponent` is imported/used.

**Step 2: Wrap with DnD context**

Wrap the usage like:
```typescript
import EditorDndContextComponent from '@/features/editor/components/editor-dnd-context.component';
import EditorLayoutComponent from '@/features/editor/components/editor-layout.component';

// In render:
<EditorDndContextComponent>
  <EditorLayoutComponent />
</EditorDndContextComponent>
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(editor): integrate DnD context"
```

---

## Task 14: Make Tabs Sortable with dnd-kit

**Files:**
- Modify: `src/features/editor/components/editor-tabs.component.tsx`
- Modify: `src/features/editor/components/editor-tab.component.tsx`

**Step 1: Update EditorTabsComponent with SortableContext**

Add imports and wrap tabs in SortableContext:

```typescript
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

// In render, wrap the tabs:
<SortableContext items={files.map(f => f.id)} strategy={horizontalListSortingStrategy}>
  {files.map(file => (
    <EditorTabComponent ... />
  ))}
</SortableContext>
```

**Step 2: Update EditorTabComponent to be draggable**

Add useSortable hook:

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// In component:
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({
  id: file.id,
  data: {
    fileId: file.id,
    fileName: file.name,
    fromGroupId: groupId,
  },
});

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
};

// Apply to the tab div:
<div
  ref={setNodeRef}
  style={style}
  {...attributes}
  {...listeners}
  ...
>
```

**Step 3: Handle drag end for reordering**

Update the DnD context to call `reorderFile` when dropping within same group.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(editor): add sortable tabs with dnd-kit"
```

---

## Task 15: Final Testing and Cleanup

**Step 1: Run full build**

```bash
npm run build
```

**Step 2: Run dev server and test all features**

```bash
npm run dev
```

Test checklist:
- [ ] Single group displays correctly
- [ ] Opening files adds to last focused group
- [ ] Context menu shows correct "Move" vs "Split and Move" labels
- [ ] Move Left/Right creates or moves to groups correctly
- [ ] Move Up/Down creates or moves to rows correctly
- [ ] Empty groups are removed automatically
- [ ] Tab reordering via drag works
- [ ] Drag overlay shows file name
- [ ] All keyboard navigation works

**Step 3: Format code**

```bash
npm run format
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(editor): complete dynamic split implementation"
```

---

Plan complete and saved to `docs/plans/2025-01-29-editor-split-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?