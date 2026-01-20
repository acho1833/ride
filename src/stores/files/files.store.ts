/**
 * Files State Store
 *
 * Zustand slice for managing file explorer UI state.
 * File structure is fetched from server; this store only manages:
 * - `structure`: Cached file tree from server
 * - `selectedId`: Currently highlighted item
 * - `openFolderIds`: Which folders are expanded
 * - `isLoaded`: Whether initial data has loaded
 */

import { StateCreator } from 'zustand';
import type { FolderNode } from '@/models/user-file-tree.model';

// ============================================================================
// Types
// ============================================================================

/** File tree state interface */
export interface FileTreeState {
  files: {
    structure: FolderNode | null;
    selectedId: string | null;
    openFolderIds: string[];
    isLoaded: boolean;
  };
}

/** File tree action methods */
export interface FileTreeActions {
  setFileStructure: (structure: FolderNode) => void;
  setSelectedFileId: (id: string | null) => void;
  setOpenFolderIds: (ids: string[]) => void;
  toggleFolder: (folderId: string) => void;
  setFilesLoaded: () => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;
  revealFile: (fileId: string) => void;
  resetFileTreeState: () => void;
}

/** Combined file tree store type */
export type FileTreeSlice = FileTreeState & FileTreeActions;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all folder IDs recursively from a folder node
 */
export const getAllFolderIds = (node: FolderNode): string[] => {
  const ids: string[] = [node.id];
  node.children.forEach(child => {
    if (child.type === 'folder') {
      ids.push(...getAllFolderIds(child as FolderNode));
    }
  });
  return ids;
};

/**
 * Find a file node by ID in the tree.
 */
export const findFileById = (tree: FolderNode, fileId: string): { id: string; name: string; metadata: Record<string, unknown> } | null => {
  for (const child of tree.children) {
    if (child.id === fileId && child.type === 'file') {
      return { id: child.id, name: child.name, metadata: child.metadata };
    }
    if (child.type === 'folder') {
      const result = findFileById(child as FolderNode, fileId);
      if (result) return result;
    }
  }
  return null;
};

/**
 * Find the path of parent folder IDs from root to a file.
 */
export const findPathToFile = (tree: FolderNode, fileId: string, path: string[] = []): string[] | null => {
  for (const child of tree.children) {
    if (child.id === fileId) {
      return [...path, tree.id];
    }
    if (child.type === 'folder') {
      const result = findPathToFile(child as FolderNode, fileId, [...path, tree.id]);
      if (result) return result;
    }
  }
  return null;
};

/**
 * Clean openFolderIds to only include IDs that exist in the tree
 */
export const cleanOpenFolderIds = (openIds: string[], tree: FolderNode): string[] => {
  const validIds = new Set(getAllFolderIds(tree));
  return openIds.filter(id => validIds.has(id));
};

// ============================================================================
// Slice Creator
// ============================================================================

/**
 * Creates the file tree slice for the store
 */
export const createFileTreeSlice: StateCreator<FileTreeSlice, [], [], FileTreeSlice> = set => ({
  files: {
    structure: null,
    selectedId: null,
    openFolderIds: [],
    isLoaded: false
  },

  setFileStructure: (structure: FolderNode) =>
    set(state => {
      // Clean openFolderIds when structure changes
      const cleanedOpenIds = cleanOpenFolderIds(state.files.openFolderIds, structure);
      return {
        files: {
          ...state.files,
          structure,
          openFolderIds: cleanedOpenIds.length > 0 ? cleanedOpenIds : [structure.id],
          // Default selection to root folder if nothing is selected
          selectedId: state.files.selectedId ?? structure.id
        }
      };
    }),

  setSelectedFileId: (selectedId: string | null) =>
    set(state => ({
      // Always keep something selected - fall back to root folder if null
      files: { ...state.files, selectedId: selectedId ?? state.files.structure?.id ?? null }
    })),

  setOpenFolderIds: (openFolderIds: string[]) =>
    set(state => ({
      files: { ...state.files, openFolderIds }
    })),

  toggleFolder: (folderId: string) =>
    set(state => ({
      files: {
        ...state.files,
        openFolderIds: state.files.openFolderIds.includes(folderId)
          ? state.files.openFolderIds.filter((id: string) => id !== folderId)
          : [...state.files.openFolderIds, folderId]
      }
    })),

  setFilesLoaded: () =>
    set(state => ({
      files: { ...state.files, isLoaded: true }
    })),

  expandAllFolders: () =>
    set(state => {
      if (!state.files.structure) return state;
      return {
        files: {
          ...state.files,
          openFolderIds: getAllFolderIds(state.files.structure)
        }
      };
    }),

  collapseAllFolders: () =>
    set(state => {
      if (!state.files.structure) return state;
      return {
        files: {
          ...state.files,
          openFolderIds: [state.files.structure.id]
        }
      };
    }),

  revealFile: (fileId: string) =>
    set(state => {
      if (!state.files.structure) return state;
      const path = findPathToFile(state.files.structure, fileId);
      if (!path) return state;

      const newOpenFolderIds = [...state.files.openFolderIds];
      for (const folderId of path) {
        if (!newOpenFolderIds.includes(folderId)) {
          newOpenFolderIds.push(folderId);
        }
      }

      return {
        files: {
          ...state.files,
          selectedId: fileId,
          openFolderIds: newOpenFolderIds
        }
      };
    }),

  resetFileTreeState: () =>
    set(() => ({
      files: {
        structure: null,
        selectedId: null,
        openFolderIds: [],
        isLoaded: false
      }
    }))
});
