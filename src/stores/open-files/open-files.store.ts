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
  openFile: (fileId: string, name: string, groupId?: GroupId, insertIndex?: number) => void;
  closeFile: (fileId: string, groupId: GroupId) => void;
  setActiveFile: (fileId: string, groupId: GroupId) => void;
  closeAllFilesInGroup: (groupId: GroupId) => void;
  closeOtherFiles: (fileId: string, groupId: GroupId) => void;

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
  activeFileId: null
});

/** Create row with one empty group */
const createRow = (id?: string): EditorRow => ({
  id: id ?? generateId(),
  groups: [createGroup()]
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
    groups: row.groups.filter(g => g.files.length > 0)
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

const initialGroupId1 = generateId();
const initialGroupId2 = generateId();

const initialState: OpenFilesState['openFiles'] = {
  rows: [
    {
      id: generateId(),
      groups: [
        {
          id: initialGroupId1,
          files: [
            { id: 'ws1', name: 'WS1.ws' },
            { id: 'ws2', name: 'WS2.ws' },
            { id: 'txt1', name: 'TXT1.txt' }
          ],
          activeFileId: 'ws1'
        },
        {
          id: initialGroupId2,
          files: [
            { id: 'ws3', name: 'WS3.ws' },
            { id: 'txt2', name: 'TXT2.txt' }
          ],
          activeFileId: 'ws3'
        }
      ]
    }
  ],
  lastFocusedGroupId: initialGroupId1
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createOpenFilesSlice: StateCreator<OpenFilesSlice, [], [], OpenFilesSlice> = set => ({
  openFiles: initialState,

  // Open file in group (or last focused, or first available)
  openFile: (fileId: string, name: string, groupId?: GroupId, insertIndex?: number) =>
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
                groups: row.groups.map((g, gi) => (gi === existing.groupIndex ? { ...g, activeFileId: fileId } : g))
              }
            : row
        );
        return {
          openFiles: {
            rows: newRows,
            lastFocusedGroupId: existing.group.id
          }
        };
      }

      // Determine target group
      const targetGroupId = groupId ?? lastFocusedGroupId ?? rows[0]?.groups[0]?.id;
      if (!targetGroupId) return state;

      const location = findGroupLocation(rows, targetGroupId);
      if (!location) return state;

      // Add file at specified index or end of target group
      const newFiles = [...location.group.files];
      const idx = insertIndex ?? newFiles.length;
      newFiles.splice(idx, 0, { id: fileId, name });

      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) =>
                gi === location.groupIndex
                  ? {
                      ...g,
                      files: newFiles,
                      activeFileId: fileId
                    }
                  : g
              )
            }
          : row
      );

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: targetGroupId
        }
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
              groups: row.groups.map((g, gi) => (gi === location.groupIndex ? { ...g, files: newFiles, activeFileId: newActiveFileId } : g))
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
          lastFocusedGroupId: newLastFocusedGroupId
        }
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
              groups: row.groups.map((g, gi) => (gi === location.groupIndex ? { ...g, activeFileId: fileId } : g))
            }
          : row
      );

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: groupId
        }
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
              groups: row.groups.map((g, gi) => (gi === location.groupIndex ? { ...g, files: [], activeFileId: null } : g))
            }
          : row
      );

      const cleanedRows = cleanupEmptyGroupsAndRows(newRows);
      const newLastFocusedGroupId = cleanedRows[0]?.groups[0]?.id ?? null;

      return {
        openFiles: {
          rows: cleanedRows,
          lastFocusedGroupId: newLastFocusedGroupId
        }
      };
    }),

  // Close all files except the specified one
  closeOtherFiles: (fileId: string, groupId: GroupId) =>
    set(state => {
      const { rows } = state.openFiles;
      const location = findGroupLocation(rows, groupId);
      if (!location) return state;

      const fileToKeep = location.group.files.find(f => f.id === fileId);
      if (!fileToKeep) return state;

      const newRows = rows.map((row, ri) =>
        ri === location.rowIndex
          ? {
              ...row,
              groups: row.groups.map((g, gi) => (gi === location.groupIndex ? { ...g, files: [fileToKeep], activeFileId: fileId } : g))
            }
          : row
      );

      return {
        openFiles: {
          ...state.openFiles,
          rows: newRows
        }
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
            })
          };
        }
        if (ri === fromLocation.rowIndex) {
          return {
            ...row,
            groups: row.groups.map((g, gi) =>
              gi === fromLocation.groupIndex ? { ...g, files: newFromFiles, activeFileId: newFromActiveId } : g
            )
          };
        }
        if (ri === toLocation.rowIndex) {
          return {
            ...row,
            groups: row.groups.map((g, gi) => (gi === toLocation.groupIndex ? { ...g, files: targetFiles, activeFileId: fileId } : g))
          };
        }
        return row;
      });

      newRows = cleanupEmptyGroupsAndRows(newRows);

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: toGroupId
        }
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

      const { yGroupLimit, xGroupLimit } = EDITOR_CONFIG;

      // Remove file from source
      const newFromFiles = fromLocation.group.files.filter(f => f.id !== fileId);
      let newFromActiveId = fromLocation.group.activeFileId;
      if (fromLocation.group.activeFileId === fileId) {
        newFromActiveId = newFromFiles.length > 0 ? newFromFiles[0].id : null;
      }

      // Track target group ID for lastFocusedGroupId
      let targetGroupId = generateId();

      let newRows = [...rows];

      if (direction === 'left' || direction === 'right') {
        const currentRow = rows[fromLocation.rowIndex];
        const targetGroupIndex = direction === 'left' ? fromLocation.groupIndex - 1 : fromLocation.groupIndex + 1;
        const hasExistingGroup = targetGroupIndex >= 0 && targetGroupIndex < currentRow.groups.length;

        if (hasExistingGroup) {
          // Move to existing adjacent group
          const targetGroup = currentRow.groups[targetGroupIndex];
          targetGroupId = targetGroup.id;

          newRows = newRows.map((row, ri) =>
            ri === fromLocation.rowIndex
              ? {
                  ...row,
                  groups: row.groups.map((g, gi) => {
                    if (gi === fromLocation.groupIndex) {
                      return { ...g, files: newFromFiles, activeFileId: newFromActiveId };
                    }
                    if (gi === targetGroupIndex) {
                      return { ...g, files: [...g.files, file], activeFileId: fileId };
                    }
                    return g;
                  })
                }
              : row
          );
        } else {
          // Create new group - check xGroupLimit first
          if (xGroupLimit !== -1 && currentRow.groups.length >= xGroupLimit) {
            return state;
          }

          const newGroup: EditorGroup = {
            id: targetGroupId,
            files: [file],
            activeFileId: fileId
          };

          const newGroups = [...currentRow.groups];

          // Update source group first
          newGroups[fromLocation.groupIndex] = {
            ...fromLocation.group,
            files: newFromFiles,
            activeFileId: newFromActiveId
          };

          // Insert new group at the correct position
          // For left: insert at position 0 (leftmost)
          // For right: insert after the source group
          const insertIdx = direction === 'left' ? 0 : fromLocation.groupIndex + 1;
          newGroups.splice(insertIdx, 0, newGroup);

          newRows[fromLocation.rowIndex] = { ...currentRow, groups: newGroups };
        }
      } else {
        // up or down
        const targetRowIndex = direction === 'up' ? fromLocation.rowIndex - 1 : fromLocation.rowIndex + 1;
        const hasExistingRow = targetRowIndex >= 0 && targetRowIndex < rows.length;

        if (hasExistingRow) {
          // Move to existing row - add file to first group in that row
          const existingTargetRow = rows[targetRowIndex];
          const targetGroup = existingTargetRow.groups[0];
          targetGroupId = targetGroup.id;

          newRows = newRows.map((row, ri) => {
            if (ri === fromLocation.rowIndex) {
              return {
                ...row,
                groups: row.groups.map((g, gi) =>
                  gi === fromLocation.groupIndex ? { ...g, files: newFromFiles, activeFileId: newFromActiveId } : g
                )
              };
            }
            if (ri === targetRowIndex) {
              return {
                ...row,
                groups: row.groups.map((g, gi) => (gi === 0 ? { ...g, files: [...g.files, file], activeFileId: fileId } : g))
              };
            }
            return row;
          });
        } else {
          // Create new row - check yGroupLimit first
          if (yGroupLimit !== -1 && rows.length >= yGroupLimit) {
            return state;
          }

          const newGroup: EditorGroup = {
            id: targetGroupId,
            files: [file],
            activeFileId: fileId
          };

          // Update source group
          newRows = newRows.map((row, ri) =>
            ri === fromLocation.rowIndex
              ? {
                  ...row,
                  groups: row.groups.map((g, gi) =>
                    gi === fromLocation.groupIndex ? { ...g, files: newFromFiles, activeFileId: newFromActiveId } : g
                  )
                }
              : row
          );

          // Create new row
          const newRow: EditorRow = {
            id: generateId(),
            groups: [newGroup]
          };

          if (direction === 'up') {
            newRows = [newRow, ...newRows];
          } else {
            newRows = [...newRows, newRow];
          }
        }
      }

      newRows = cleanupEmptyGroupsAndRows(newRows);

      return {
        openFiles: {
          rows: newRows,
          lastFocusedGroupId: targetGroupId
        }
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
              groups: row.groups.map((g, gi) => (gi === location.groupIndex ? { ...g, files: newFiles } : g))
            }
          : row
      );

      return {
        openFiles: {
          ...state.openFiles,
          rows: newRows
        }
      };
    }),

  // Set last focused group
  setLastFocusedGroup: (groupId: GroupId) =>
    set(state => ({
      openFiles: {
        ...state.openFiles,
        lastFocusedGroupId: groupId
      }
    }))
});
