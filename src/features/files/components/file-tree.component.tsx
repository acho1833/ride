/**
 * File Tree Component
 *
 * Recursive component that renders individual nodes in the file explorer tree.
 *
 * @remarks
 * This component uses FileTreeContext to access shared state and callbacks,
 * reducing prop drilling from 14+ props to just 3 (node, depth, isRoot).
 *
 * Key behaviors:
 * - **Files**: Click to select, double-click to open in editor, draggable to editor tabs
 * - **Folders**: Click to select, click chevron to toggle expand/collapse
 * - **Context menus**: Right-click for actions (Rename, Delete, New File, New Folder)
 * - **Inline renaming**: Triggered from context menu, uses focused input field
 *
 * Drag-drop uses native HTML5 DnD with FILE_TREE_MIME_TYPE to allow dropping
 * files into editor tab bars. This is separate from dnd-kit used for tab reordering.
 *
 * @see FileTreeContext - Provides all shared state and callbacks
 * @see FILE_TREE_MIME_TYPE - Custom MIME type for file tree drag operations
 */

'use client';

import type { TreeNode } from '@/models/user-file-tree.model';
import { useEffect, useRef } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NewNodeInputComponent from '@/features/files/components/new-node-input.component';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { FILE_TREE_MIME_TYPE } from '@/features/editor/const';
import { useFileTreeContext } from '@/features/files/components/file-tree-context';

// Re-export types from context for backwards compatibility
export type { FileType, EditingNode } from '@/features/files/components/file-tree-context';

interface Props {
  /** The tree node to render (file or folder) */
  node: TreeNode;
  /** Nesting depth for indentation calculation. Defaults to 0 for root. */
  depth?: number;
  /** True if this is the root folder. Root cannot be deleted. */
  isRoot?: boolean;
}

const FileTreeComponent = ({ node, depth = 0, isRoot = false }: Props) => {
  const {
    selectedId,
    openFolderIds,
    openFileIds,
    editingNode,
    renamingId,
    onSelect,
    onAddFile,
    onAddFolder,
    onDelete,
    onRename,
    onToggleFolder,
    onFinishEditing,
    onCancelEditing,
    onStartRename
  } = useFileTreeContext();

  const isOpen = openFolderIds.includes(node.id);
  const isFileOpen = node.type === 'file' && openFileIds.has(node.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRenaming = renamingId === node.id;
  const { openFile } = useOpenFilesActions();

  // Auto-focus the input field when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newName = e.currentTarget.value.trim();
      if (newName) {
        onRename(node.id, newName);
      }
    } else if (e.key === 'Escape') {
      onStartRename('');
    }
  };

  const handleRenameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newName = e.currentTarget.value.trim();
    if (newName) {
      onRename(node.id, newName);
    } else {
      onStartRename('');
    }
  };

  /**
   * Initiate HTML5 drag with file data in custom MIME type.
   * This allows dropping files onto editor tab bars.
   */
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(FILE_TREE_MIME_TYPE, JSON.stringify({ fileId: node.id, fileName: node.name }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Render a file node (leaf in the tree)
  if (node.type === 'file') {
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 transition-colors ${
              selectedId === node.id ? 'bg-accent' : ''
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            draggable
            onDragStart={handleDragStart}
            onDoubleClick={() => openFile(node.id, node.name)}
            onClick={() => onSelect(node.id)}
          >
            <FileIcon className={`h-4 w-4 shrink-0 ${isFileOpen ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
            {isRenaming ? (
              <Input
                ref={inputRef}
                defaultValue={node.name}
                className="h-6 text-sm"
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameBlur}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm">{node.name}</span>
            )}
          </div>
        </ContextMenuTrigger>
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
              {isOpen ? <ChevronDownIcon className="h-4 w-4 shrink-0" /> : <ChevronRightIcon className="h-4 w-4 shrink-0" />}
              {isOpen ? (
                <FolderOpenIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
              {isRenaming ? (
                <Input
                  ref={inputRef}
                  defaultValue={node.name}
                  className="h-6 text-sm font-medium"
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleRenameBlur}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm font-medium">{node.name}</span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {editingNode && editingNode.parentId === node.id && (
                <NewNodeInputComponent
                  key={editingNode.tempId}
                  depth={depth + 1}
                  type={editingNode.type}
                  onFinish={onFinishEditing}
                  onCancel={onCancelEditing}
                />
              )}
              {node.children?.map(child => (
                <FileTreeComponent key={child.id} node={child} depth={depth + 1} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onAddFile(node.id)}>New File</ContextMenuItem>
        <ContextMenuItem onClick={() => onAddFolder(node.id)}>New Folder</ContextMenuItem>
        <ContextMenuItem onClick={() => onStartRename(node.id)}>Rename</ContextMenuItem>
        {!isRoot && <ContextMenuItem onClick={() => onDelete(node.id)}>Delete</ContextMenuItem>}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FileTreeComponent;
