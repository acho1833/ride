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
 *
 * Drag-drop uses native HTML5 DnD with FILE_TREE_MIME_TYPE to allow dropping
 * files into editor tab bars. This is separate from dnd-kit used for tab reordering.
 *
 * @see FileTreeContext - Provides all shared state and callbacks
 * @see FILE_TREE_MIME_TYPE - Custom MIME type for file tree drag operations
 */

'use client';

import React from 'react';
import type { TreeNode } from '@/models/user-file-tree.model';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { getFileIcon } from '@/const';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { useCurrentProject } from '@/stores/projects/projects.selector';
import { FILE_TREE_MIME_TYPE } from '@/features/editor/const';
import { useFileTreeContext } from '@/features/files/components/file-tree-context';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { FileDragData, FileDropData } from '@/features/files/components/file-tree-dnd-context.component';

// Re-export types from context for backwards compatibility
export type { FileType } from '@/features/files/components/file-tree-context';

/**
 * Sort children: folders first, then files, both alphabetically (case-insensitive)
 */
function sortChildren(children: TreeNode[]): TreeNode[] {
  return [...children].sort((a, b) => {
    // Folders come before files
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Alphabetical, case-insensitive
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

interface Props {
  /** The tree node to render (file or folder) */
  node: TreeNode;
  /** Nesting depth for indentation calculation. Defaults to 0 for root. */
  depth?: number;
  /** True if this is the root folder. Root cannot be deleted. */
  isRoot?: boolean;
  /** Parent folder ID for creating new files/folders at sibling level */
  parentId?: string;
}

const FileTreeComponent = ({ node, depth = 0, isRoot = false, parentId }: Props) => {
  const {
    selectedId,
    openFolderIds,
    openFileIds,
    onSelect,
    onToggleFolder,
    onAddFile,
    onAddFolder,
    onRename,
    onDelete,
    draggedNodeId,
    dropTargetFolderId
  } = useFileTreeContext();

  // Get project name for root folder display
  const currentProject = useCurrentProject();

  const isOpen = openFolderIds.includes(node.id);
  const isFileOpen = node.type === 'file' && openFileIds.has(node.id);
  const { openFile } = useOpenFilesActions();

  // Check if this node or any ancestor is the drop target (for highlighting)
  const isDropTarget = dropTargetFolderId === node.id;
  const isWithinDropTarget = dropTargetFolderId === parentId;
  const shouldHighlight = isDropTarget || isWithinDropTarget;

  // Check if this is the dragged node
  const isDragging = draggedNodeId === node.id;

  // dnd-kit draggable setup
  const dragData: FileDragData = {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type
  };

  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging: isDndKitDragging
  } = useDraggable({
    id: `drag-${node.id}`,
    data: dragData,
    disabled: isRoot
  });

  // dnd-kit droppable setup (folders only)
  const dropData: FileDropData = { folderId: node.id };

  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop-${node.id}`,
    data: dropData,
    disabled: node.type !== 'folder'
  });

  // Combined ref setter for folders (both draggable and droppable)
  const setRefs = (el: HTMLElement | null) => {
    setDragRef(el);
    if (node.type === 'folder') {
      setDropRef(el);
    }
  };

  // Styling classes for drag state
  const highlightClass = shouldHighlight && !isDragging ? 'bg-accent/50' : '';
  const draggingClass = isDndKitDragging ? 'opacity-50' : '';

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
    // For files, new file/folder creates at parent level
    const newNodeParentId = parentId ?? node.id;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setDragRef}
            data-node-id={node.id}
            className={`hover:bg-accent flex cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 transition-colors ${
              selectedId === node.id ? 'bg-accent' : ''
            } ${highlightClass} ${draggingClass}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            draggable
            onDragStart={handleDragStart}
            onDoubleClick={() => openFile(node.id, node.name)}
            onClick={() => onSelect(node.id)}
            onContextMenu={e => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            {...dragAttributes}
            {...dragListeners}
          >
            {React.createElement(getFileIcon(node.name), {
              className: `h-4 w-4 shrink-0 ${isFileOpen ? 'text-primary' : 'text-muted-foreground'}`
            })}
            <span className="text-sm">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onAddFile(newNodeParentId)}>New File</ContextMenuItem>
          <ContextMenuItem onClick={() => onAddFolder(newNodeParentId)}>New Folder</ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(node)}>Rename</ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(node)}>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Render a folder node (including root)
  return (
    <div className={highlightClass}>
      <Collapsible open={isOpen} onOpenChange={() => onToggleFolder(node.id)}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              ref={setRefs}
              data-node-id={node.id}
              className={`hover:bg-accent flex w-full cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
                selectedId === node.id ? 'bg-accent' : ''
              } ${draggingClass}`}
              style={{ paddingLeft: `${depth * 10}px` }}
              onClick={e => {
                e.stopPropagation();
                onSelect(node.id);
              }}
              onContextMenu={e => {
                e.stopPropagation();
                onSelect(node.id);
              }}
              {...dragAttributes}
              {...dragListeners}
            >
              <CollapsibleTrigger onClick={e => e.stopPropagation()} className="flex shrink-0 items-center justify-center">
                {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              </CollapsibleTrigger>
              {isOpen ? (
                <FolderOpenIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
              <span className="text-sm font-medium">{isRoot && currentProject ? currentProject.name : node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onAddFile(node.id)}>New File</ContextMenuItem>
            <ContextMenuItem onClick={() => onAddFolder(node.id)}>New Folder</ContextMenuItem>
            {!isRoot && <ContextMenuItem onClick={() => onRename(node)}>Rename</ContextMenuItem>}
            {!isRoot && <ContextMenuItem onClick={() => onDelete(node)}>Delete</ContextMenuItem>}
          </ContextMenuContent>
        </ContextMenu>
        <CollapsibleContent>
          {node.children &&
            sortChildren(node.children).map(child => (
              <FileTreeComponent key={child.id} node={child} depth={depth + 1} parentId={node.id} />
            ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default FileTreeComponent;
