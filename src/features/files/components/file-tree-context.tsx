/**
 * File Tree Context
 *
 * React Context for sharing file tree state and callbacks with nested components.
 *
 * @remarks
 * Created to eliminate prop drilling in FileTreeComponent. Before this context,
 * FileTreeComponent had 14+ props passed recursively through every level of the tree.
 * Now it only needs 3 props (node, depth, isRoot).
 *
 * The context value is populated by FilesComponent (the parent) and consumed
 * by FileTreeComponent instances at any nesting depth.
 *
 * State managed:
 * - `selectedId` - Currently highlighted item in the tree
 * - `openFolderIds` - Which folders are expanded
 * - `openFileIds` - Which files are open in the editor (for visual indicator)
 * - `editingNode` - Tracks in-progress file/folder creation
 * - `renamingId` - Which node is being renamed inline
 *
 * @see FileTreeComponent - Consumes this context
 * @see FilesComponent - Provides this context
 */

'use client';

import React, { createContext, useContext } from 'react';

/** Type for file vs folder distinction */
export type FileType = 'file' | 'folder';

/**
 * Type for tracking which node is currently being created.
 * Used to show inline input field at the correct location.
 */
export type EditingNode = {
  /** ID of the parent folder where the new node will be created */
  parentId: string;
  /** Whether creating a file or folder */
  type: FileType;
  /** Temporary ID for React key (replaced with real ID after creation) */
  tempId: string;
};

/**
 * Context value shape for file tree operations.
 * Contains both state and callbacks to avoid multiple context providers.
 */
interface FileTreeContextValue {
  /** Currently selected item ID in the tree */
  selectedId: string | null;
  /** Array of folder IDs that are expanded */
  openFolderIds: string[];
  /** Set of file IDs currently open in editor (for visual distinction) */
  openFileIds: Set<string>;
  /** Node being created (shows inline input), null if not creating */
  editingNode: EditingNode | null;
  /** ID of node being renamed, null if not renaming */
  renamingId: string | null;
  /** Select a node (highlight it) */
  onSelect: (id: string) => void;
  /** Start creating a new file in the given parent folder */
  onAddFile: (parentId: string) => void;
  /** Start creating a new folder in the given parent folder */
  onAddFolder: (parentId: string) => void;
  /** Delete a node by ID */
  onDelete: (nodeId: string) => void;
  /** Rename a node */
  onRename: (nodeId: string, newName: string) => void;
  /** Toggle folder expand/collapse */
  onToggleFolder: (folderId: string) => void;
  /** Complete file/folder creation with the given name */
  onFinishEditing: (name: string) => void;
  /** Cancel file/folder creation */
  onCancelEditing: () => void;
  /** Start inline rename mode for a node */
  onStartRename: (id: string) => void;
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

/**
 * Hook to access file tree context.
 * @throws Error if used outside of FileTreeProvider
 */
export const useFileTreeContext = (): FileTreeContextValue => {
  const context = useContext(FileTreeContext);
  if (!context) {
    throw new Error('useFileTreeContext must be used within a FileTreeProvider');
  }
  return context;
};

interface FileTreeProviderProps {
  children: React.ReactNode;
  /** The context value to provide to children */
  value: FileTreeContextValue;
}

/** Provider component that wraps the file tree and supplies context */
export const FileTreeProvider = ({ children, value }: FileTreeProviderProps) => {
  return <FileTreeContext.Provider value={value}>{children}</FileTreeContext.Provider>;
};
