/**
 * Files State Store
 *
 * Zustand slice for managing the file explorer tree structure and selection state.
 *
 * @remarks
 * This store manages:
 * - `structure`: The hierarchical tree of files and folders
 * - `selectedId`: Currently highlighted item in the explorer
 * - `openFolderIds`: Which folders are expanded (visible children)
 *
 * The tree is recursive: folders contain children which can be files or folders.
 * All mutations create new objects (immutable updates) to trigger React re-renders.
 *
 * Helper functions handle tree traversal:
 * - `findAndAddNode`: Recursively finds a folder and adds a child
 * - `findAndRemoveNode`: Recursively finds and removes a node
 * - `findPathToFile`: Returns all parent folder IDs for a given file
 *
 * @see FileTreeSlice - Combined type for state + actions
 * @see files.selector.ts - Selector hooks for accessing this state
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
  revealFile: (fileId: string) => void;
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
 * Find the path of parent folder IDs from root to a file.
 *
 * @remarks
 * Used by `revealFile` to know which folders to expand.
 * Returns the folder IDs in order from root to immediate parent.
 *
 * @param tree - The folder to search within
 * @param fileId - The ID of the file to find
 * @param path - Accumulator for the path (internal use)
 * @returns Array of folder IDs from root to parent, or null if not found
 */
export const findPathToFile = (tree: FolderNode, fileId: string, path: string[] = []): string[] | null => {
  for (const child of tree.children) {
    if (child.id === fileId) {
      return [...path, tree.id];
    }
    if (child.type === 'folder') {
      const result = findPathToFile(child, fileId, [...path, tree.id]);
      if (result) return result;
    }
  }
  return null;
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
              id: 'ws1',
              name: 'WS1.ws',
              type: 'file'
            },
            {
              id: 'ws2',
              name: 'WS2.ws',
              type: 'file'
            },
            {
              id: 'txt1',
              name: 'TXT1.txt',
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
              id: 'ws3',
              name: 'WS3.ws',
              type: 'file'
            },
            {
              id: 'txt2',
              name: 'TXT2.txt',
              type: 'file'
            },
            {
              id: 'ws4',
              name: 'WS4.ws',
              type: 'file'
            }
          ]
        },
        {
          id: 'jsx1',
          name: 'JSX1.jsx',
          type: 'file'
        },
        {
          id: 'js1',
          name: 'JS1.js',
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
          id: 'ws5',
          name: 'WS5.ws',
          type: 'file'
        },
        {
          id: 'ws6',
          name: 'WS6.ws',
          type: 'file'
        }
      ]
    },
    {
      id: 'ws7',
      name: 'WS7.ws',
      type: 'file'
    },
    {
      id: 'ws8',
      name: 'WS8.ws',
      type: 'file'
    },
    {
      id: 'txt3',
      name: 'TXT3.txt',
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
    selectedId: 'ws1',
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
    })),

  /**
   * Reveal a file in the tree by expanding all parent folders and selecting it.
   * Called when "Select Opened Files" is enabled and user clicks a tab.
   */
  revealFile: (fileId: string) =>
    set(state => {
      const path = findPathToFile(state.files.structure, fileId);
      if (!path) return state;

      // Expand all parent folders and select the file
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
    })
});
