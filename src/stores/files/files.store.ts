/**
 * Files State Store
 *
 * Zustand slice for managing file tree state.
 */

import { StateCreator } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type FileNode = {
  name: string;
  type: 'file';
  id: string;
};

export type FolderNode = {
  name: string;
  type: 'folder';
  id: string;
  children: TreeNode[];
};

export type TreeNode = FileNode | FolderNode;

/** File tree state interface */
export interface FileTreeState {
  files: {
    structure: FolderNode;
    selectedId: string | null;
    openFolderIds: string[];
  };
}

/** File tree action methods */
export interface FileTreeActions {
  setFileStructure: (structure: FolderNode) => void;
  setSelectedFileId: (id: string | null) => void;
  setOpenFolderIds: (ids: string[]) => void;
  toggleFolder: (folderId: string) => void;
  addNode: (parentId: string, node: TreeNode) => void;
  deleteNode: (nodeId: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;
}

/** Combined file tree store type */
export type FileTreeSlice = FileTreeState & FileTreeActions;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function to get all folder IDs recursively
 */
export const getAllFolderIds = (node: FolderNode): string[] => {
  const ids: string[] = [node.id];
  node.children.forEach(child => {
    if (child.type === 'folder') {
      ids.push(...getAllFolderIds(child));
    }
  });
  return ids;
};

/**
 * Helper function to find and add a node to a folder
 */
export const findAndAddNode = (tree: FolderNode, targetFolderId: string, nodeToAdd: TreeNode): FolderNode => {
  if (tree.id === targetFolderId) {
    return {
      ...tree,
      children: [...tree.children, nodeToAdd]
    };
  }

  return {
    ...tree,
    children: tree.children.map(child => {
      if (child.type === 'folder') {
        return findAndAddNode(child, targetFolderId, nodeToAdd);
      }
      return child;
    })
  };
};

/**
 * Helper function to find and remove a node
 */
export const findAndRemoveNode = (tree: FolderNode, nodeId: string): FolderNode => {
  return {
    ...tree,
    children: tree.children
      .filter(child => child.id !== nodeId)
      .map(child => {
        if (child.type === 'folder') {
          return findAndRemoveNode(child, nodeId);
        }
        return child;
      })
  };
};

/**
 * Helper function to find and rename a node
 */
export const findAndRenameNode = (tree: FolderNode, nodeId: string, newName: string): FolderNode => {
  if (tree.id === nodeId) {
    return { ...tree, name: newName };
  }

  return {
    ...tree,
    children: tree.children.map(child => {
      if (child.id === nodeId) {
        return { ...child, name: newName };
      }
      if (child.type === 'folder') {
        return findAndRenameNode(child, nodeId, newName);
      }
      return child;
    })
  };
};

/**
 * Initial file structure
 */
export const initialFileStructure: FolderNode = {
  id: crypto.randomUUID(),
  name: 'workspaces',
  type: 'folder',
  children: [
    {
      id: crypto.randomUUID(),
      name: 'Use Case 1',
      type: 'folder',
      children: [
        {
          id: crypto.randomUUID(),
          name: 'John Doe',
          type: 'folder',
          children: [
            {
              id: crypto.randomUUID(),
              name: 'sample1.ws',
              type: 'file'
            },
            {
              id: crypto.randomUUID(),
              name: 'sample2.ws',
              type: 'file'
            },
            {
              id: 'id3',
              name: 'sample3.ws',
              type: 'file'
            }
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'Jane Doe',
          type: 'folder',
          children: [
            {
              id: crypto.randomUUID(),
              name: 'sample1.ws',
              type: 'file'
            },
            {
              id: crypto.randomUUID(),
              name: 'sample2.ws',
              type: 'file'
            },
            {
              id: crypto.randomUUID(),
              name: 'sample3.ws',
              type: 'file'
            }
          ]
        },
        {
          id: crypto.randomUUID(),
          name: 'App.jsx',
          type: 'file'
        },
        {
          id: crypto.randomUUID(),
          name: 'index.js',
          type: 'file'
        }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Use Case 2',
      type: 'folder',
      children: [
        {
          id: crypto.randomUUID(),
          name: 'sample1.ws',
          type: 'file'
        },
        {
          id: crypto.randomUUID(),
          name: 'sample2.ws',
          type: 'file'
        }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'high_level.ws',
      type: 'file'
    },
    {
      id: crypto.randomUUID(),
      name: 'low_level.ws',
      type: 'file'
    },
    {
      id: crypto.randomUUID(),
      name: 'note.txt',
      type: 'file'
    }
  ]
};

// ============================================================================
// Slice Creator
// ============================================================================

/**
 * Creates the file tree slice for the store
 */
export const createFileTreeSlice: StateCreator<FileTreeSlice, [], [], FileTreeSlice> = set => ({
  files: {
    structure: initialFileStructure,
    selectedId: 'id3',
    openFolderIds: getAllFolderIds(initialFileStructure)
  },

  // File tree actions
  setFileStructure: (structure: FolderNode) =>
    set(state => ({
      files: { ...state.files, structure }
    })),

  setSelectedFileId: (selectedId: string | null) =>
    set(state => ({
      files: { ...state.files, selectedId }
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

  addNode: (parentId: string, node: TreeNode) =>
    set(state => ({
      files: {
        structure: findAndAddNode(state.files.structure, parentId, node),
        selectedId: node.id,
        // If adding a folder, also add its ID to openFolderIds
        openFolderIds:
          node.type === 'folder'
            ? [...state.files.openFolderIds, node.id, parentId]
            : state.files.openFolderIds.includes(parentId)
              ? state.files.openFolderIds
              : [...state.files.openFolderIds, parentId]
      }
    })),

  deleteNode: (nodeId: string) =>
    set(state => ({
      files: {
        ...state.files,
        structure: findAndRemoveNode(state.files.structure, nodeId),
        selectedId: state.files.selectedId === nodeId ? null : state.files.selectedId
      }
    })),

  renameNode: (nodeId: string, newName: string) =>
    set(state => ({
      files: {
        ...state.files,
        structure: findAndRenameNode(state.files.structure, nodeId, newName)
      }
    })),

  expandAllFolders: () =>
    set(state => ({
      files: {
        ...state.files,
        openFolderIds: getAllFolderIds(state.files.structure)
      }
    })),

  collapseAllFolders: () =>
    set(state => ({
      files: {
        ...state.files,
        openFolderIds: [state.files.structure.id]
      }
    }))
});
