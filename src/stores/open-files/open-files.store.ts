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

// ============================================================================
// Slice Creator (placeholder - will be implemented in Task 4)
// ============================================================================

export const createOpenFilesSlice: StateCreator<OpenFilesSlice, [], [], OpenFilesSlice> = set => ({
  openFiles: initialState,

  // Placeholder actions - will be implemented in Task 4
  openFile: () => {},
  closeFile: () => {},
  setActiveFile: () => {},
  closeAllFilesInGroup: () => {},
  moveFileToGroup: () => {},
  moveFileToNewGroup: () => {},
  reorderFile: () => {},
  setLastFocusedGroup: () => {},
});
