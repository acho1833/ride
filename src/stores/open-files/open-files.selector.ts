/**
 * Open Files Selectors
 *
 * Selector functions and hooks for open files state.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { OpenFilesSlice, EditorGroup, GroupId } from './open-files.store';

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
