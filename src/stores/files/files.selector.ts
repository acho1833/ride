/**
 * Files Selectors
 *
 * Selector hooks for accessing file tree state from components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { FileTreeSlice } from './files.store';

// ============================================================================
// State Selectors
// ============================================================================

/** Get the root folder containing the entire file tree structure */
export const useFileStructure = () => useAppStore((state: FileTreeSlice) => state.files.structure);

/** Get the currently selected/highlighted item ID in the file tree */
export const useSelectedFileId = () => useAppStore((state: FileTreeSlice) => state.files.selectedId);

/** Get array of folder IDs that are currently expanded */
export const useOpenFolderIds = () => useAppStore((state: FileTreeSlice) => state.files.openFolderIds);

/** Get whether file tree data has been loaded */
export const useFilesIsLoaded = () => useAppStore((state: FileTreeSlice) => state.files.isLoaded);

/** Get the entire files state object */
export const useFiles = () => useAppStore((state: FileTreeSlice) => state.files);

// ============================================================================
// Action Selector
// ============================================================================

/**
 * Get all file tree actions.
 */
export const useFileActions = () =>
  useAppStore(
    useShallow((state: FileTreeSlice) => ({
      setFileStructure: state.setFileStructure,
      setSelectedFileId: state.setSelectedFileId,
      setOpenFolderIds: state.setOpenFolderIds,
      toggleFolder: state.toggleFolder,
      setFilesLoaded: state.setFilesLoaded,
      expandAllFolders: state.expandAllFolders,
      collapseAllFolders: state.collapseAllFolders,
      revealFile: state.revealFile
    }))
  );
