/**
 * Open Files Selectors
 *
 * Selector functions and hooks for open files state.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { OpenFilesSlice } from './open-files.store';

// ============================================================================
// Selector Hooks
// ============================================================================

/** Hook for left group files */
export const useLeftGroupFiles = () => useAppStore((state: OpenFilesSlice) => state.openFiles.left.files);

/** Hook for right group files */
export const useRightGroupFiles = () => useAppStore((state: OpenFilesSlice) => state.openFiles.right.files);

/** Hook for left group active file ID */
export const useLeftActiveFileId = () => useAppStore((state: OpenFilesSlice) => state.openFiles.left.activeFileId);

/** Hook for right group active file ID */
export const useRightActiveFileId = () => useAppStore((state: OpenFilesSlice) => state.openFiles.right.activeFileId);

/** Hook for entire openFiles state */
export const useOpenFilesState = () => useAppStore((state: OpenFilesSlice) => state.openFiles);

/** Hook for last focused group */
export const useLastFocusedGroup = () => useAppStore((state: OpenFilesSlice) => state.openFiles.lastFocusedGroup);

/** Hook for open files actions */
export const useOpenFilesActions = () =>
  useAppStore(
    useShallow((state: OpenFilesSlice) => ({
      openFile: state.openFile,
      openFileById: state.openFileById,
      closeFile: state.closeFile,
      setActiveFile: state.setActiveFile,
      closeAllFiles: state.closeAllFiles,
      splitFileToRight: state.splitFileToRight,
      moveFileToGroup: state.moveFileToGroup,
      closeRightGroup: state.closeRightGroup,
      setLastFocusedGroup: state.setLastFocusedGroup
    }))
  );
