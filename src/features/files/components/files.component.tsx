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
import { useFocusedPanel, useSelectOpenedFiles, useUiActions } from '@/stores/ui/ui.selector';
import FileTreeComponent from '@/features/files/components/file-tree.component';
import { FileTreeProvider, FileType } from '@/features/files/components/file-tree-context';
import FileTreeDndContextComponent from '@/features/files/components/file-tree-dnd-context.component';
import { ScrollArea } from '@/components/ui/scroll-area';
import NewNodeDialogComponent from '@/features/files/components/new-node-dialog.component';
import RenameNodeDialogComponent from '@/features/files/components/rename-node-dialog.component';
import DeleteNodeDialogComponent from '@/features/files/components/delete-node-dialog.component';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useDroppable } from '@dnd-kit/core';
import type { FileDropData } from '@/features/files/components/file-tree-dnd-context.component';
import { findNodeById, findParentFolder } from '@/features/files/utils/drag-drop.utils';

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
  const focusedPanel = useFocusedPanel();
  const isPanelFocused = focusedPanel === 'files';
  const { toggleSelectOpenedFiles, setFocusedPanel } = useUiActions();

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

  /**
   * Scroll to selected file when it changes (for "Select Opened Files" feature).
   * Uses a small delay to ensure the DOM has updated after folder expansion.
   */
  useEffect(() => {
    if (!selectOpenedFiles || !selectedId) return;

    const timeoutId = setTimeout(() => {
      const element = document.querySelector(`[data-node-id="${selectedId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50); // Small delay to allow folder expansion to complete

    return () => clearTimeout(timeoutId);
  }, [selectOpenedFiles, selectedId]);

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
   * Handle Delete key to open delete confirmation dialog.
   * Only triggers when files panel is focused and a non-root node is selected.
   *
   * Note: Only attaches listener when panel is focused to avoid multiple listeners
   * from different FilesComponent instances (which can happen due to CSS-hidden rendering).
   */
  useEffect(() => {
    // Only attach listener when this panel is focused
    if (!isPanelFocused) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Delete or Backspace key
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      // Don't trigger if dialog is already open
      if (deleteDialog.open) return;

      // Must have something selected (not root)
      if (!selectedId || selectedId === fileStructure.id) return;

      // Find the selected node
      const selectedNode = findNodeById(fileStructure, selectedId);
      if (!selectedNode) return;

      // Prevent default browser behavior (e.g., navigating back on Backspace)
      event.preventDefault();

      // Open the delete confirmation dialog
      handleStartDelete(selectedNode);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPanelFocused, selectedId, fileStructure, deleteDialog.open]);

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
   * Adds a new file based on current selection:
   * - If a folder is selected: create inside that folder
   * - If a file is selected: create at the same level (parent folder)
   * - If nothing selected: create at root
   */
  const handleToolbarAddFile = (): void => {
    if (!selectedId) {
      handleAddFile(fileStructure.id);
      return;
    }

    const selectedNode = findNodeById(fileStructure, selectedId);
    if (!selectedNode) {
      handleAddFile(fileStructure.id);
      return;
    }

    if (selectedNode.type === 'folder') {
      // Selected a folder - create inside it
      handleAddFile(selectedId);
    } else {
      // Selected a file - create at same level (parent folder)
      const parent = findParentFolder(fileStructure, selectedId);
      handleAddFile(parent?.id ?? fileStructure.id);
    }
  };

  // Viewport ref for programmatic scrolling during drag
  const viewportRef = useRef<HTMLDivElement>(null);

  // Drag state - will be updated by FileTreeDndContextComponent via callback
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  /**
   * Callback for FileTreeDndContextComponent to update drag state
   */
  const handleDragStateChange = (draggedId: string | null, dropTargetId: string | null) => {
    setDraggedNodeId(draggedId);
    setDropTargetFolderId(dropTargetId);
  };

  // Empty space drop zone for dropping to root
  const dropData: FileDropData = { folderId: fileStructure.id };
  const { setNodeRef: setEmptyDropRef } = useDroppable({
    id: 'drop-empty-space',
    data: dropData
  });

  // Context value for FileTreeProvider - React Compiler handles memoization
  const fileTreeContextValue = {
    selectedId,
    openFolderIds,
    openFileIds,
    isPanelFocused,
    onSelect: setSelectedFileId,
    onToggleFolder: toggleFolder,
    onAddFile: handleAddFile,
    onAddFolder: handleAddFolder,
    onRename: handleStartRename,
    onDelete: handleStartDelete,
    draggedNodeId,
    dropTargetFolderId
  };

  // Toolbar buttons that appear at the top of the file tree
  const toolbarButtons = (
    <>
      <Button variant="ghost" size="xs" onClick={handleToolbarAddFile} title="New File">
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

  /**
   * Handle context menu on empty space - deselect any selected node
   */
  const handleEmptySpaceContextMenu = () => {
    setSelectedFileId(null);
  };

  return (
    <MainPanelsComponent title="Files" pos={pos} tools={toolbarButtons} focusPanelType="files">
      <FileTreeDndContextComponent
        fileStructure={fileStructure}
        openFolderIds={openFolderIds}
        onToggleFolder={toggleFolder}
        viewportRef={viewportRef}
        onDragStateChange={handleDragStateChange}
      >
        {/* Root-level context menu for empty space - only shows New File/Folder */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full" type="hover" viewportRef={viewportRef}>
                <div
                  ref={setEmptyDropRef}
                  className="min-h-full"
                  onContextMenu={handleEmptySpaceContextMenu}
                  onClick={() => setFocusedPanel('files')}
                >
                  <FileTreeProvider value={fileTreeContextValue}>
                    <FileTreeComponent node={fileStructure} isRoot={true} />
                  </FileTreeProvider>
                </div>
              </ScrollArea>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleAddFile(fileStructure.id)}>New File</ContextMenuItem>
            <ContextMenuItem onClick={() => handleAddFolder(fileStructure.id)}>New Folder</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </FileTreeDndContextComponent>

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
