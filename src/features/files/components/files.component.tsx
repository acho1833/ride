/**
 * Files Component
 *
 * Main file explorer panel containing the file tree and toolbar.
 *
 * @remarks
 * This component serves as the container and data provider for the file explorer.
 * It manages:
 * - File tree structure from Zustand store
 * - Local state for inline editing (creating/renaming nodes)
 * - Toolbar buttons (New File, Select Opened Files, Expand/Collapse All)
 * - FileTreeContext provider for passing state to nested tree nodes
 *
 * "Select Opened Files" feature:
 * When enabled, clicking a tab in the editor will reveal and select that file
 * in the file tree. This helps users locate the file they're currently editing.
 * When the toggle is turned ON, it immediately reveals the currently active file.
 *
 * @see FileTreeContext - Context for sharing state with nested FileTreeComponents
 * @see FileTreeComponent - Renders individual nodes in the tree
 */

'use client';

import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronsDownUp, ChevronsUpDown, FilePlus, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import type { TreeNode } from '@/models/user-file-tree.model';
import { useFileActions, useFileStructure, useOpenFolderIds, useSelectedFileId } from '@/stores/files/files.selector';
import { useOpenFileIds, useLastFocusedGroupId, useEditorGroup } from '@/stores/open-files/open-files.selector';
import { useSelectOpenedFiles, useUiActions } from '@/stores/ui/ui.selector';
import FileTreeComponent from '@/features/files/components/file-tree.component';
import { EditingNode, FileTreeProvider } from '@/features/files/components/file-tree-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useFileAddMutation } from '@/features/files/hooks/useFileAddMutation';
import { useFileDeleteMutation } from '@/features/files/hooks/useFileDeleteMutation';
import { useFileRenameMutation } from '@/features/files/hooks/useFileRenameMutation';

interface Props {
  /** Position of this panel in the layout (for MainPanelsComponent) */
  pos: ToolbarPositions;
}

const FilesComponent: React.FC<Props> = ({ pos }) => {
  // Get state from store - fileStructure is guaranteed to be loaded by AppLoaderProvider
  const fileStructure = useFileStructure()!;
  const selectedId = useSelectedFileId();
  const openFolderIds = useOpenFolderIds();
  const openFileIds = useOpenFileIds();

  // Get actions from file store
  const { setSelectedFileId, toggleFolder, expandAllFolders, collapseAllFolders, revealFile } = useFileActions();

  // Server mutations
  const { mutate: addNode } = useFileAddMutation();
  const { mutate: deleteNode } = useFileDeleteMutation();
  const { mutate: renameNode } = useFileRenameMutation();

  // Get UI state and actions
  const selectOpenedFiles = useSelectOpenedFiles();
  const { toggleSelectOpenedFiles } = useUiActions();

  // Get active file from last focused group
  const lastFocusedGroupId = useLastFocusedGroupId();
  const lastFocusedGroup = useEditorGroup(lastFocusedGroupId ?? '');
  const activeFileId = lastFocusedGroup?.activeFileId ?? null;

  /**
   * Auto-reveal on toggle enable.
   * When user turns ON the "Select Opened Files" toggle, immediately reveal
   * the currently active file so they see the effect right away.
   */
  const prevSelectOpenedFiles = useRef(selectOpenedFiles);
  useEffect(() => {
    if (selectOpenedFiles && !prevSelectOpenedFiles.current && activeFileId) {
      revealFile(activeFileId);
    }
    prevSelectOpenedFiles.current = selectOpenedFiles;
  }, [selectOpenedFiles, activeFileId, revealFile]);

  // Local state for tracking editing and renaming
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  /**
   * Initiates the process of adding a new file or folder
   */
  const handleAddFile = (parentId: string): void => {
    // Ensure the parent folder is open so the user can see the new file
    if (!openFolderIds.includes(parentId)) {
      toggleFolder(parentId);
    }
    setEditingNode({
      parentId,
      type: 'file',
      tempId: `temp-${Date.now()}` // Temporary unique ID
    });
  };

  /**
   * Initiates the process of adding a new folder
   */
  const handleAddFolder = (parentId: string): void => {
    // Ensure the parent folder is open so the user can see the new folder
    if (!openFolderIds.includes(parentId)) {
      toggleFolder(parentId);
    }
    setEditingNode({
      parentId,
      type: 'folder',
      tempId: `temp-${Date.now()}`
    });
  };

  /**
   * Completes the process of creating a new file or folder
   */
  const handleFinishEditing = (name: string): void => {
    if (!editingNode || !name.trim()) {
      setEditingNode(null);
      return;
    }

    // Create the new node with a unique ID
    const newNode: TreeNode =
      editingNode.type === 'file'
        ? {
            id: crypto.randomUUID(),
            name: name.trim(),
            type: 'file',
            metadata: {}
          }
        : {
            id: crypto.randomUUID(),
            name: name.trim(),
            type: 'folder',
            children: []
          };

    // Add the node via server mutation
    addNode({ parentId: editingNode.parentId, node: newNode });
    setEditingNode(null);
  };

  /**
   * Cancels the process of creating a new file or folder
   */
  const handleCancelEditing = (): void => {
    setEditingNode(null);
  };

  /**
   * Deletes a node from the tree
   */
  const handleDelete = (nodeId: string): void => {
    if (nodeId === fileStructure.id) return; // Can't delete root folder
    deleteNode({ nodeId });
  };

  /**
   * Renames a node in the tree
   */
  const handleRename = (nodeId: string, newName: string): void => {
    renameNode({ nodeId, newName });
    setRenamingId(null); // Clear the renaming state
  };

  /**
   * Initiates the rename process for a node
   */
  const handleStartRename = (nodeId: string): void => {
    setRenamingId(nodeId);
  };

  /**
   * Adds a new file to the root folder
   */
  const handleAddFileToRoot = (): void => {
    handleAddFile(fileStructure.id);
  };

  // Context value for FileTreeProvider - React Compiler handles memoization
  const fileTreeContextValue = {
    selectedId,
    openFolderIds,
    openFileIds,
    editingNode,
    renamingId,
    onSelect: setSelectedFileId,
    onAddFile: handleAddFile,
    onAddFolder: handleAddFolder,
    onDelete: handleDelete,
    onRename: handleRename,
    onToggleFolder: toggleFolder,
    onFinishEditing: handleFinishEditing,
    onCancelEditing: handleCancelEditing,
    onStartRename: handleStartRename
  };

  // Toolbar buttons that appear at the top of the file tree
  const toolbarButtons = (
    <>
      <Button variant="ghost" size="xs" onClick={handleAddFileToRoot} title="New File">
        <FilePlus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={toggleSelectOpenedFiles}
        title="Select Opened Files"
        className={selectOpenedFiles ? 'text-primary' : ''}
      >
        <Crosshair className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="xs" onClick={expandAllFolders} title="Expand All">
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="xs" onClick={collapseAllFolders} title="Collapse All">
        <ChevronsDownUp className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <MainPanelsComponent title="Files" pos={pos} tools={toolbarButtons}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <ScrollArea className="flex-1 overflow-y-auto">
            <FileTreeProvider value={fileTreeContextValue}>
              <FileTreeComponent node={fileStructure} isRoot={true} />
            </FileTreeProvider>
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleAddFileToRoot}>New File</ContextMenuItem>
          <ContextMenuItem onClick={() => handleAddFolder(fileStructure.id)}>New Folder</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </MainPanelsComponent>
  );
};

export default FilesComponent;
