import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import React, { useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import { TreeNode } from '@/stores/files/files.store';
import { useFileActions, useFileStructure, useOpenFolderIds, useSelectedFileId } from '@/stores/files/files.selector';
import FileTreeComponent, { EditingNode, FileType } from '@/features/files/components/file-tree.component';
import NewNodeInputComponent from '@/features/files/components/new-node-input.component';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  pos: ToolbarPositions;
}

/**
 * Main component that manages the entire file tree
 */
const FilesComponent: React.FC<Props> = ({ pos }) => {
  // Get state from store
  const fileStructure = useFileStructure();
  const selectedId = useSelectedFileId();
  const openFolderIds = useOpenFolderIds();

  // Get actions from file store
  const { setSelectedFileId, toggleFolder, addNode, deleteNode, renameNode, expandAllFolders, collapseAllFolders } = useFileActions();

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
            type: 'file'
          }
        : {
            id: crypto.randomUUID(),
            name: name.trim(),
            type: 'folder',
            children: []
          };

    // Add the node to the store
    addNode(editingNode.parentId, newNode);
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
    deleteNode(nodeId);
  };

  /**
   * Renames a node in the tree
   */
  const handleRename = (nodeId: string, newName: string): void => {
    renameNode(nodeId, newName);
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

  // Toolbar buttons that appear at the top of the file tree
  const toolbarButtons = (
    <>
      <Button variant="ghost" size="xs" onClick={handleAddFileToRoot} title="New File">
        <FilePlus className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="xs" onClick={expandAllFolders} title="Expand All">
        <ChevronsDownUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="xs" onClick={collapseAllFolders} title="Collapse All">
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <MainPanelsComponent title="Files" pos={pos} tools={toolbarButtons}>
      {/* Show new node input at root level if editing at root */}
      {editingNode && editingNode.parentId === fileStructure.id && (
        <NewNodeInputComponent
          key={editingNode.tempId}
          depth={0}
          type={editingNode.type}
          onFinish={handleFinishEditing}
          onCancel={handleCancelEditing}
        />
      )}
      {/* Render the entire file tree starting from the root */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <FileTreeComponent
          node={fileStructure}
          selectedId={selectedId}
          onSelect={setSelectedFileId}
          onAddFile={handleAddFile}
          onAddFolder={handleAddFolder}
          onDelete={handleDelete}
          onRename={handleRename}
          isRoot={true}
          openFolderIds={openFolderIds}
          onToggleFolder={toggleFolder}
          editingNode={editingNode}
          onFinishEditing={handleFinishEditing}
          onCancelEditing={handleCancelEditing}
          renamingId={renamingId}
          onStartRename={handleStartRename}
        />
      </ScrollArea>
    </MainPanelsComponent>
  );
};

export default FilesComponent;
