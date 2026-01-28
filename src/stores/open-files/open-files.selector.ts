/**
 * Open Files Selectors
 *
 * Selector hooks for accessing open files state from components.
 *
 * @remarks
 * Key patterns used:
 * - `useShallow` for object selectors to prevent re-renders on reference changes
 * - `useMemo` for derived data (like Set creation) to maintain stable references
 * - Granular selectors for minimal subscription scope
 *
 * @see open-files.store.ts - The underlying store slice
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { OpenFilesSlice, EditorGroup, GroupId } from './open-files.store';
import { EDITOR_CONFIG } from '@/features/editor/const';

// ============================================================================
// State Selectors
// ============================================================================

/** Get all editor rows (the top-level layout structure) */
export const useEditorRows = () => useAppStore((state: OpenFilesSlice) => state.openFiles.rows);

/**
 * Get all open file IDs as a Set.
 *
 * @remarks
 * Used by file tree to show visual indicator on open files.
 * Uses useShallow to get a stable array reference, then useMemo to create
 * a stable Set. Without memoization, new Set() on every render would cause
 * unnecessary re-renders in consuming components.
 */
export const useOpenFileIds = (): Set<string> => {
  const ids = useAppStore(
    useShallow((state: OpenFilesSlice) => {
      const idList: string[] = [];
      for (const row of state.openFiles.rows) {
        for (const group of row.groups) {
          for (const file of group.files) {
            if (!idList.includes(file.id)) {
              idList.push(file.id);
            }
          }
        }
      }
      return idList;
    })
  );
  return useMemo(() => new Set(ids), [ids]);
};

/** Get the ID of the group that was last clicked/focused. Used as default target for new files. */
export const useLastFocusedGroupId = () => useAppStore((state: OpenFilesSlice) => state.openFiles.lastFocusedGroupId);

/**
 * Get a specific editor group by ID.
 * Returns null if the group doesn't exist (e.g., during cleanup transitions).
 */
export const useEditorGroup = (groupId: GroupId): EditorGroup | null =>
  useAppStore((state: OpenFilesSlice) => {
    for (const row of state.openFiles.rows) {
      const group = row.groups.find(g => g.id === groupId);
      if (group) return group;
    }
    return null;
  });

/** Get total number of rows in the editor layout */
export const useRowCount = () => useAppStore((state: OpenFilesSlice) => state.openFiles.rows.length);

/** Get number of groups in a specific row */
export const useGroupCountInRow = (rowIndex: number): number =>
  useAppStore((state: OpenFilesSlice) => state.openFiles.rows[rowIndex]?.groups.length ?? 0);

// ============================================================================
// Action Selector
// ============================================================================

/**
 * Get all open files actions.
 * Uses useShallow to return a stable object reference.
 */
export const useOpenFilesActions = () =>
  useAppStore(
    useShallow((state: OpenFilesSlice) => ({
      openFile: state.openFile,
      openNewFile: state.openNewFile,
      closeFile: state.closeFile,
      closeFileFromAllGroups: state.closeFileFromAllGroups,
      setActiveFile: state.setActiveFile,
      closeAllFilesInGroup: state.closeAllFilesInGroup,
      closeOtherFiles: state.closeOtherFiles,
      moveFileToGroup: state.moveFileToGroup,
      moveFileToNewGroup: state.moveFileToNewGroup,
      reorderFile: state.reorderFile,
      setLastFocusedGroup: state.setLastFocusedGroup,
      resetOpenFilesState: state.resetOpenFilesState
    }))
  );

// ============================================================================
// Utility Selectors (for context menu logic)
// ============================================================================

/**
 * Determine if a file can be moved in a given direction from a group.
 *
 * @remarks
 * Used by EditorTabComponent to show/hide context menu options.
 * Returns both whether the move is possible AND whether it would create a new group.
 *
 * Logic:
 * - If there's an adjacent group/row in that direction → Move to existing (isNewGroup: false)
 * - If not → Would create new group/row (isNewGroup: true)
 * - Can't split if only 1 file in source group (nothing would remain)
 *
 * @param groupId - The group containing the file to move
 * @param direction - The direction to check
 * @returns Object with canMove boolean and isNewGroup boolean
 */
export const useCanMoveInDirection = (
  groupId: GroupId,
  direction: 'left' | 'right' | 'up' | 'down'
): { canMove: boolean; isNewGroup: boolean } =>
  useAppStore(
    useShallow((state: OpenFilesSlice) => {
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

      if (!group) {
        return { canMove: false, isNewGroup: false };
      }

      const row = rows[rowIndex];
      const hasMultipleFiles = group.files.length >= 2;

      // Count total groups across all rows (for up/down split logic)
      const totalGroups = rows.reduce((sum, r) => sum + r.groups.length, 0);
      const hasMultipleGroups = totalGroups >= 2;

      // Check if we're at max row limit (can't create new rows)
      const { yGroupLimit } = EDITOR_CONFIG;
      const atMaxRows = yGroupLimit !== -1 && rows.length >= yGroupLimit;

      switch (direction) {
        case 'left': {
          const isNewGroup = groupIndex === 0;
          // Can't split and move if only 1 file
          return {
            canMove: isNewGroup ? hasMultipleFiles : true,
            isNewGroup
          };
        }
        case 'right': {
          const isNewGroup = groupIndex === row.groups.length - 1;
          return {
            canMove: isNewGroup ? hasMultipleFiles : true,
            isNewGroup
          };
        }
        case 'up': {
          const hasRowAbove = rowIndex > 0;
          if (hasRowAbove) {
            // Move to existing row above
            return { canMove: true, isNewGroup: false };
          }
          // Would create new row - check if allowed
          return {
            canMove: !atMaxRows && hasMultipleGroups,
            isNewGroup: true
          };
        }
        case 'down': {
          const hasRowBelow = rowIndex < rows.length - 1;
          if (hasRowBelow) {
            // Move to existing row below
            return { canMove: true, isNewGroup: false };
          }
          // Would create new row - check if allowed
          return {
            canMove: !atMaxRows && hasMultipleGroups,
            isNewGroup: true
          };
        }
        default:
          return { canMove: false, isNewGroup: false };
      }
    })
  );
