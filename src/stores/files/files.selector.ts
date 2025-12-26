/**
 * Files Selectors
 *
 * Selector functions and hooks for file tree state.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { FileTreeSlice } from './files.store';

// ============================================================================
// Selector Hooks
// ============================================================================

/** Hook for file structure */
export const useFileStructure = () => useAppStore((state: FileTreeSlice) => state.files.structure);

/** Hook for selected file ID */
export const useSelectedFileId = () => useAppStore((state: FileTreeSlice) => state.files.selectedId);

/** Hook for open folder IDs */
export const useOpenFolderIds = () => useAppStore((state: FileTreeSlice) => state.files.openFolderIds);

/** Hook for entire files object */
export const useFiles = () => useAppStore((state: FileTreeSlice) => state.files);

/** Hook for file tree actions */
export const useFileActions = () =>
  useAppStore(
    useShallow((state: FileTreeSlice) => ({
      setFileStructure: state.setFileStructure,
      setSelectedFileId: state.setSelectedFileId,
      setOpenFolderIds: state.setOpenFolderIds,
      toggleFolder: state.toggleFolder,
      addNode: state.addNode,
      deleteNode: state.deleteNode,
      renameNode: state.renameNode,
      expandAllFolders: state.expandAllFolders,
      collapseAllFolders: state.collapseAllFolders
    }))
  );
