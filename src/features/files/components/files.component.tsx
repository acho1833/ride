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
import { FileTreeProvider, FileType } from '@/features/files/components/file-tree-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import NewNodeDialogComponent from '@/features/files/components/new-node-dialog.component';
import RenameNodeDialogComponent from '@/features/files/components/rename-node-dialog.component';
import DeleteNodeDialogComponent from '@/features/files/components/delete-node-dialog.component';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';

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

  // Track which node was right-clicked for context menu
  const [rightClickedNode, setRightClickedNode] = useState<TreeNode | null>(null);

  // Dialog state for creating new file/folder
  const [newNodeDialog, setNewNodeDialog] = useState<{ open: boolean; parentId: string; type: FileType }>({
    open: false,
    parentId: '',
    type: 'file'
  });

  // Dialog state for renaming
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; nodeId: string; currentName: string }>({
    open: false,
    nodeId: '',
    currentName: ''
  });

  // Dialog state for delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    nodeId: string;
    nodeName: string;
    nodeType: 'file' | 'folder';
  }>({
    open: false,
    nodeId: '',
    nodeName: '',
    nodeType: 'file'
  });

  /**
   * Opens dialog to add a new file
   */
  const handleAddFile = (parentId: string): void => {
    // Ensure the parent folder is open so the user can see the new file
    if (!openFolderIds.includes(parentId)) {
      toggleFolder(parentId);
    }
    setNewNodeDialog({ open: true, parentId, type: 'file' });
  };

  /**
   * Opens dialog to add a new folder
   */
  const handleAddFolder = (parentId: string): void => {
    // Ensure the parent folder is open so the user can see the new folder
    if (!openFolderIds.includes(parentId)) {
      toggleFolder(parentId);
    }
    setNewNodeDialog({ open: true, parentId, type: 'folder' });
  };

  /**
   * Closes the new node dialog
   */
  const handleNewNodeDialogClose = (): void => {
    setNewNodeDialog(prev => ({ ...prev, open: false }));
  };

  /**
   * Opens the delete confirmation dialog for a node
   */
  const handleStartDelete = (node: TreeNode): void => {
    if (node.id === fileStructure.id) return; // Can't delete root folder
    setDeleteDialog({ open: true, nodeId: node.id, nodeName: node.name, nodeType: node.type });
  };

  /**
   * Closes the delete dialog
   */
  const handleDeleteDialogClose = (): void => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  /**
   * Opens the rename dialog for a node
   */
  const handleStartRename = (node: TreeNode): void => {
    setRenameDialog({ open: true, nodeId: node.id, currentName: node.name });
  };

  /**
   * Closes the rename dialog
   */
  const handleRenameDialogClose = (): void => {
    setRenameDialog(prev => ({ ...prev, open: false }));
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
    onSelect: setSelectedFileId,
    onToggleFolder: toggleFolder,
    onContextMenu: setRightClickedNode
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

  // Determine context menu target - use right-clicked node or root for empty space
  const contextMenuTargetId = rightClickedNode?.id ?? fileStructure.id;
  const isTargetFolder = !rightClickedNode || rightClickedNode.type === 'folder';
  const isTargetRoot = !rightClickedNode || rightClickedNode.id === fileStructure.id;

  /**
   * Handle context menu on the file tree container.
   * Only reset rightClickedNode if clicking directly on empty space (not on a node).
   */
  const handleTreeContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only reset if the click target is the container itself (empty space)
    if (e.target === e.currentTarget) {
      setRightClickedNode(null);
    }
  };

  return (
    <MainPanelsComponent title="Files" pos={pos} tools={toolbarButtons}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="min-h-full" onContextMenu={handleTreeContextMenu}>
              <FileTreeProvider value={fileTreeContextValue}>
                <FileTreeComponent node={fileStructure} isRoot={true} />
              </FileTreeProvider>
            </div>
          </ScrollArea>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {/* Show New File/Folder for folders and empty space */}
          {isTargetFolder && (
            <>
              <ContextMenuItem onClick={() => handleAddFile(contextMenuTargetId)}>New File</ContextMenuItem>
              <ContextMenuItem onClick={() => handleAddFolder(contextMenuTargetId)}>New Folder</ContextMenuItem>
            </>
          )}
          {/* Show Rename/Delete for non-root nodes */}
          {rightClickedNode && !isTargetRoot && (
            <>
              <ContextMenuItem onClick={() => handleStartRename(rightClickedNode)}>Rename</ContextMenuItem>
              <ContextMenuItem onClick={() => handleStartDelete(rightClickedNode)}>Delete</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Dialog for creating new file/folder */}
      <NewNodeDialogComponent
        open={newNodeDialog.open}
        type={newNodeDialog.type}
        parentId={newNodeDialog.parentId}
        onClose={handleNewNodeDialogClose}
      />

      {/* Dialog for renaming file/folder */}
      <RenameNodeDialogComponent
        open={renameDialog.open}
        nodeId={renameDialog.nodeId}
        currentName={renameDialog.currentName}
        onClose={handleRenameDialogClose}
      />

      {/* Dialog for delete confirmation */}
      <DeleteNodeDialogComponent
        open={deleteDialog.open}
        nodeId={deleteDialog.nodeId}
        nodeName={deleteDialog.nodeName}
        nodeType={deleteDialog.nodeType}
        onClose={handleDeleteDialogClose}
      />
    </MainPanelsComponent>
  );
};

export default FilesComponent;
