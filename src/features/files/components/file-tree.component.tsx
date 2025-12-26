'use client';

import { TreeNode } from '@/stores/files/files.store';
import { useEffect, useRef } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NewNodeInputComponent from '@/features/files/components/new-node-input.component';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';

export type FileType = 'file' | 'folder';

// Type for tracking which node is currently being created (file or folder)
export type EditingNode = {
  parentId: string; // ID of the parent folder where the new node will be created
  type: FileType; // Type of node being created
  tempId: string; // Temporary ID to track the editing state
};

// Props for the FileTreeNode component (individual file/folder in the tree)
interface Props {
  node: TreeNode; // The current node to render
  depth?: number; // Indentation depth in the tree (0 for root)
  selectedId: string | null; // ID of currently selected node
  onSelect: (id: string) => void; // Callback when a node is clicked
  onAddFile: (parentId: string) => void; // Callback to add a new file
  onAddFolder: (parentId: string) => void; // Callback to add a new folder
  onDelete: (nodeId: string) => void; // Callback to delete a node
  onRename: (nodeId: string, newName: string) => void; // Callback to rename a node
  isRoot?: boolean; // Whether this is the root node (prevents deletion)
  openFolderIds: string[]; // Array of folder IDs that are currently expanded
  onToggleFolder: (folderId: string) => void; // Callback to expand/collapse a folder
  editingNode: EditingNode | null; // Currently editing node (if any)
  onFinishEditing: (name: string) => void; // Callback when editing is complete
  onCancelEditing: () => void; // Callback to cancel editing
  renamingId: string | null; // ID of node currently being renamed
  onStartRename: (id: string) => void; // Callback to start renaming a node
}

/**
 * Component that renders a single node in the file tree
 * Handles both files and folders with different rendering logic
 */
const FileTreeComponent = ({
  node,
  depth = 0,
  selectedId,
  onSelect,
  onAddFile,
  onAddFolder,
  onDelete,
  onRename,
  isRoot = false,
  openFolderIds,
  onToggleFolder,
  editingNode,
  onFinishEditing,
  onCancelEditing,
  renamingId,
  onStartRename
}: Props) => {
  const isOpen = openFolderIds.includes(node.id); // Check if this folder is expanded
  const inputRef = useRef<HTMLInputElement>(null); // Reference to the input field for renaming
  const isRenaming = renamingId === node.id; // Check if this node is being renamed
  const { openFileById } = useOpenFilesActions();

  // Auto-focus the input field when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select all text for easy overwriting
    }
  }, [isRenaming]);

  // Handle keyboard input during rename
  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Confirm rename on Enter key
      const newName = e.currentTarget.value.trim();
      if (newName) {
        onRename(node.id, newName);
      }
    } else if (e.key === 'Escape') {
      // Cancel rename on Escape key
      onStartRename('');
    }
  };

  // Handle losing focus during rename
  const handleRenameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newName = e.currentTarget.value.trim();
    if (newName) {
      onRename(node.id, newName); // Save the new name
    } else {
      onStartRename(''); // Cancel if empty
    }
  };

  // Render a file node
  if (node.type === 'file') {
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 transition-colors ${
              selectedId === node.id ? 'bg-accent' : ''
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }} // Indent based on depth
            onDoubleClick={() => {
              openFileById(node.id, node.name);
            }}
            onClick={() => onSelect(node.id)}
          >
            <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            {isRenaming ? (
              // Show input field when renaming
              <Input
                ref={inputRef}
                defaultValue={node.name}
                className="h-6 text-sm"
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameBlur}
                onClick={e => e.stopPropagation()} // Prevent selection when clicking input
              />
            ) : (
              // Show file name normally
              <span className="text-sm">{node.name}</span>
            )}
          </div>
        </ContextMenuTrigger>
        {/* Right-click context menu for files */}
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onStartRename(node.id)}>Rename</ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(node.id)}>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Render a folder node
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          {/* Collapsible component handles expand/collapse functionality */}
          <Collapsible open={isOpen} onOpenChange={() => onToggleFolder(node.id)}>
            <CollapsibleTrigger
              className={`hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
                selectedId === node.id ? 'bg-accent' : ''
              }`}
              style={{ paddingLeft: `${depth * 10}px` }}
              onClick={e => {
                e.stopPropagation();
                onSelect(node.id);
              }}
            >
              {/* Chevron icon shows expand/collapse state */}
              {isOpen ? <ChevronDownIcon className="h-4 w-4 shrink-0" /> : <ChevronRightIcon className="h-4 w-4 shrink-0" />}
              {/* Folder icon changes based on open/closed state */}
              {isOpen ? (
                <FolderOpenIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
              {isRenaming ? (
                // Show input field when renaming
                <Input
                  ref={inputRef}
                  defaultValue={node.name}
                  className="h-6 text-sm font-medium"
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleRenameBlur}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                // Show folder name normally
                <span className="text-sm font-medium">{node.name}</span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Show input for new file/folder if this is the parent being edited */}
              {editingNode && editingNode.parentId === node.id && (
                <NewNodeInputComponent
                  key={editingNode.tempId}
                  depth={depth + 1}
                  type={editingNode.type}
                  onFinish={onFinishEditing}
                  onCancel={onCancelEditing}
                />
              )}
              {/* Recursively render all child nodes */}
              {node.children?.map(child => (
                <FileTreeComponent
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDelete={onDelete}
                  onRename={onRename}
                  openFolderIds={openFolderIds}
                  onToggleFolder={onToggleFolder}
                  editingNode={editingNode}
                  onFinishEditing={onFinishEditing}
                  onCancelEditing={onCancelEditing}
                  renamingId={renamingId}
                  onStartRename={onStartRename}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ContextMenuTrigger>
      {/* Right-click context menu for folders */}
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onAddFile(node.id)}>New File</ContextMenuItem>
        <ContextMenuItem onClick={() => onAddFolder(node.id)}>New Folder</ContextMenuItem>
        <ContextMenuItem onClick={() => onStartRename(node.id)}>Rename</ContextMenuItem>
        {/* Root folder cannot be deleted */}
        {!isRoot && <ContextMenuItem onClick={() => onDelete(node.id)}>Delete</ContextMenuItem>}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FileTreeComponent;
