/**
 * Files Selectors
 *
 * Selector hooks for accessing file tree state from components.
 *
 * @remarks
 * Following Zustand best practices:
 * - Components never access the store directly
 * - Each selector returns the minimal state needed
 * - Actions are batched with `useShallow` to prevent re-renders when only values change
 *
 * @see files.store.ts - The underlying store slice
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { FileTreeSlice } from './files.store';

// ============================================================================
// State Selectors - One hook per piece of state for granular subscriptions
// ============================================================================

/** Get the root folder containing the entire file tree structure */
export const useFileStructure = () => useAppStore((state: FileTreeSlice) => state.files.structure);

/** Get the currently selected/highlighted item ID in the file tree */
export const useSelectedFileId = () => useAppStore((state: FileTreeSlice) => state.files.selectedId);

/** Get array of folder IDs that are currently expanded */
export const useOpenFolderIds = () => useAppStore((state: FileTreeSlice) => state.files.openFolderIds);

/** Get the entire files state object (use sparingly, prefer granular selectors) */
export const useFiles = () => useAppStore((state: FileTreeSlice) => state.files);

// ============================================================================
// Action Selector - Batched with useShallow for stable reference
// ============================================================================

/**
 * Get all file tree actions.
 * Uses useShallow to return a stable object reference when actions haven't changed.
 */
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
      collapseAllFolders: state.collapseAllFolders,
      revealFile: state.revealFile
    }))
  );
