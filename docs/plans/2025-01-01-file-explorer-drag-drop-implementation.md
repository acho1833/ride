# File Explorer Drag & Drop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable drag and drop of files/folders within the file explorer to move them between directories.

**Architecture:** Use @dnd-kit/core for drag detection and drop zones. Each folder becomes a droppable zone, each node becomes draggable. DragOverlay shows what's being dragged, folder highlighting shows where it lands. Auto-expand on hover, edge scrolling near viewport boundaries.

**Tech Stack:** @dnd-kit/core (already installed), React, Zustand, shadcn ScrollArea

---

## Task 1: Add Constants File

**Files:**
- Create: `src/features/files/const.ts`

**Step 1: Create constants file**

```typescript
// src/features/files/const.ts

/** Configuration for file tree drag and drop */
export const FILE_DND_CONFIG = {
  /** Delay before auto-expanding a collapsed folder on hover (ms) */
  AUTO_EXPAND_DELAY_MS: 700,
  /** Distance from viewport edge to trigger auto-scroll (px) */
  SCROLL_ZONE_SIZE_PX: 40,
  /** Minimum scroll speed (px per frame) */
  SCROLL_SPEED_MIN: 2,
  /** Maximum scroll speed (px per frame) */
  SCROLL_SPEED_MAX: 15,
  /** Minimum distance to activate drag (px) */
  DRAG_ACTIVATION_DISTANCE: 8,
} as const;
```

**Step 2: Commit**

```bash
git add src/features/files/const.ts
git commit -m "feat(files): add drag-drop configuration constants"
```

---

## Task 2: Extend ScrollArea with viewportRef

**Files:**
- Modify: `src/components/ui/scroll-area.tsx`

**Step 1: Add viewportRef prop to ScrollArea**

Update the ScrollArea component to accept and forward a viewportRef:

```typescript
'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '@/lib/utils';

interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  /** Ref to access the viewport element for programmatic scrolling */
  viewportRef?: React.Ref<HTMLDivElement>;
}

function ScrollArea({ className, children, viewportRef, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative', className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-px transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="bg-border relative flex-1 rounded-full" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/components/ui/scroll-area.tsx
git commit -m "feat(ui): add viewportRef prop to ScrollArea for programmatic scrolling"
```

---

## Task 3: Add Drag State to FileTreeContext

**Files:**
- Modify: `src/features/files/components/file-tree-context.tsx`

**Step 1: Extend context with drag state**

Add drag-related state to the context interface:

```typescript
'use client';

import React, { createContext, useContext } from 'react';
import type { TreeNode } from '@/models/user-file-tree.model';

/** Type for file vs folder distinction */
export type FileType = 'file' | 'folder';

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
  /** Select a node (highlight it) */
  onSelect: (id: string) => void;
  /** Toggle folder expand/collapse */
  onToggleFolder: (folderId: string) => void;
  /** Context menu actions */
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;

  // Drag state
  /** ID of the node currently being dragged (null if not dragging) */
  draggedNodeId: string | null;
  /** ID of the folder currently being hovered as drop target (null if none) */
  dropTargetFolderId: string | null;
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
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build fails (FilesComponent doesn't provide new props yet - expected)

**Step 3: Commit**

```bash
git add src/features/files/components/file-tree-context.tsx
git commit -m "feat(files): add drag state to FileTreeContext"
```

---

## Task 4: Create Helper Functions for Drop Validation

**Files:**
- Create: `src/features/files/utils/drag-drop.utils.ts`

**Step 1: Create utility functions**

```typescript
// src/features/files/utils/drag-drop.utils.ts

import type { FolderNode, TreeNode } from '@/models/user-file-tree.model';

/**
 * Find the parent folder of a node by its ID
 */
export function findParentFolder(tree: FolderNode, nodeId: string): FolderNode | null {
  for (const child of tree.children) {
    if (child.id === nodeId) {
      return tree;
    }
    if (child.type === 'folder') {
      const found = findParentFolder(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Check if targetId is a descendant of ancestorId
 */
export function isDescendant(tree: FolderNode, ancestorId: string, targetId: string): boolean {
  // Find the ancestor node
  const ancestor = findNodeById(tree, ancestorId);
  if (!ancestor || ancestor.type !== 'folder') return false;

  // Check if target is within ancestor's subtree
  return isInSubtree(ancestor, targetId);
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(tree: FolderNode, nodeId: string): TreeNode | null {
  if (tree.id === nodeId) return tree;

  for (const child of tree.children) {
    if (child.id === nodeId) return child;
    if (child.type === 'folder') {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Check if nodeId exists within the subtree rooted at folder
 */
function isInSubtree(folder: FolderNode, nodeId: string): boolean {
  for (const child of folder.children) {
    if (child.id === nodeId) return true;
    if (child.type === 'folder' && isInSubtree(child, nodeId)) return true;
  }
  return false;
}

/**
 * Check if a drop target is valid
 * Returns false for: self, descendants, current parent, files
 */
export function isValidDropTarget(
  tree: FolderNode,
  draggedId: string,
  targetId: string
): boolean {
  // Cannot drop on self
  if (draggedId === targetId) return false;

  // Target must be a folder
  const targetNode = findNodeById(tree, targetId);
  if (!targetNode || targetNode.type !== 'folder') return false;

  // Cannot drop on current parent (no-op)
  const currentParent = findParentFolder(tree, draggedId);
  if (currentParent?.id === targetId) return false;

  // Cannot drop folder into its own descendants
  if (isDescendant(tree, draggedId, targetId)) return false;

  return true;
}

/**
 * Check if a folder contains a child with the given name
 */
export function hasChildWithName(tree: FolderNode, folderId: string, name: string): boolean {
  const folder = findNodeById(tree, folderId);
  if (!folder || folder.type !== 'folder') return false;

  return folder.children.some(child => child.name === name);
}
```

**Step 2: Commit**

```bash
git add src/features/files/utils/drag-drop.utils.ts
git commit -m "feat(files): add drag-drop validation utility functions"
```

---

## Task 5: Create Move Confirmation Dialog

**Files:**
- Create: `src/features/files/components/move-confirm-dialog.component.tsx`

**Step 1: Create dialog component**

```typescript
// src/features/files/components/move-confirm-dialog.component.tsx

'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const MoveConfirmDialogComponent = ({ open, fileName, onConfirm, onCancel }: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace existing file?</AlertDialogTitle>
          <AlertDialogDescription>
            A file named &quot;{fileName}&quot; already exists in the destination folder. Do you want to replace it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Replace</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MoveConfirmDialogComponent;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/files/components/move-confirm-dialog.component.tsx
git commit -m "feat(files): add move confirmation dialog for name conflicts"
```

---

## Task 6: Create FileTreeDndContext Component

**Files:**
- Create: `src/features/files/components/file-tree-dnd-context.component.tsx`

**Step 1: Create DnD context provider with DragOverlay**

```typescript
// src/features/files/components/file-tree-dnd-context.component.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { FileIcon, FolderIcon } from 'lucide-react';
import type { FolderNode, TreeNode } from '@/models/user-file-tree.model';
import { FILE_DND_CONFIG } from '@/features/files/const';
import { isValidDropTarget, hasChildWithName, findNodeById } from '@/features/files/utils/drag-drop.utils';
import { useFileMoveMutation } from '@/features/files/hooks/useFileMoveMutation';
import MoveConfirmDialogComponent from '@/features/files/components/move-confirm-dialog.component';

/** Data attached to draggable items */
export interface FileDragData {
  nodeId: string;
  nodeName: string;
  nodeType: 'file' | 'folder';
}

/** Data attached to droppable folders */
export interface FileDropData {
  folderId: string;
}

interface DragState {
  nodeId: string;
  nodeName: string;
  nodeType: 'file' | 'folder';
}

interface PendingMove {
  nodeId: string;
  nodeName: string;
  targetFolderId: string;
}

interface Props {
  children: React.ReactNode;
  fileStructure: FolderNode;
  openFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onDragStateChange: (draggedId: string | null, dropTargetId: string | null) => void;
}

const FileTreeDndContextComponent = ({
  children,
  fileStructure,
  openFolderIds,
  onToggleFolder,
  viewportRef,
  onDragStateChange
}: Props) => {
  const [isMounted, setIsMounted] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const lastHoveredFolderRef = useRef<string | null>(null);

  const { mutate: moveFile } = useFileMoveMutation();

  // SSR guard
  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
      if (scrollAnimationRef.current) cancelAnimationFrame(scrollAnimationRef.current);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: FILE_DND_CONFIG.DRAG_ACTIVATION_DISTANCE
      }
    })
  );

  const clearAutoExpandTimer = useCallback(() => {
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as FileDragData | undefined;
    if (data) {
      setDragState({
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        nodeType: data.nodeType
      });
      onDragStateChange(data.nodeId, null);
    }
  }, [onDragStateChange]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!dragState) return;

    // Edge scrolling
    const mouseY = (event.activatorEvent as PointerEvent).clientY + event.delta.y;
    const viewport = viewportRef.current;

    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      const topZone = rect.top + FILE_DND_CONFIG.SCROLL_ZONE_SIZE_PX;
      const bottomZone = rect.bottom - FILE_DND_CONFIG.SCROLL_ZONE_SIZE_PX;

      if (mouseY < topZone) {
        const distance = topZone - mouseY;
        const speed = Math.min(
          FILE_DND_CONFIG.SCROLL_SPEED_MAX,
          FILE_DND_CONFIG.SCROLL_SPEED_MIN + distance * 0.3
        );
        viewport.scrollTop -= speed;
      } else if (mouseY > bottomZone) {
        const distance = mouseY - bottomZone;
        const speed = Math.min(
          FILE_DND_CONFIG.SCROLL_SPEED_MAX,
          FILE_DND_CONFIG.SCROLL_SPEED_MIN + distance * 0.3
        );
        viewport.scrollTop += speed;
      }
    }

    // Update drop target
    const over = event.over;
    const overData = over?.data.current as FileDropData | undefined;
    const newTargetId = overData?.folderId ?? null;

    // Validate drop target
    let validTargetId: string | null = null;
    if (newTargetId && isValidDropTarget(fileStructure, dragState.nodeId, newTargetId)) {
      validTargetId = newTargetId;
    }

    if (validTargetId !== dropTargetId) {
      setDropTargetId(validTargetId);
      onDragStateChange(dragState.nodeId, validTargetId);
    }

    // Auto-expand logic
    if (validTargetId && validTargetId !== lastHoveredFolderRef.current) {
      clearAutoExpandTimer();
      lastHoveredFolderRef.current = validTargetId;

      // Only set timer if folder is collapsed
      if (!openFolderIds.includes(validTargetId)) {
        autoExpandTimerRef.current = setTimeout(() => {
          onToggleFolder(validTargetId);
        }, FILE_DND_CONFIG.AUTO_EXPAND_DELAY_MS);
      }
    } else if (!validTargetId) {
      clearAutoExpandTimer();
      lastHoveredFolderRef.current = null;
    }
  }, [dragState, dropTargetId, fileStructure, openFolderIds, onToggleFolder, viewportRef, onDragStateChange, clearAutoExpandTimer]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    clearAutoExpandTimer();
    lastHoveredFolderRef.current = null;

    const { over } = event;
    const overData = over?.data.current as FileDropData | undefined;
    const targetFolderId = overData?.folderId;

    if (dragState && targetFolderId && isValidDropTarget(fileStructure, dragState.nodeId, targetFolderId)) {
      // Check for name conflict
      if (hasChildWithName(fileStructure, targetFolderId, dragState.nodeName)) {
        setPendingMove({
          nodeId: dragState.nodeId,
          nodeName: dragState.nodeName,
          targetFolderId
        });
      } else {
        moveFile({ nodeId: dragState.nodeId, newParentId: targetFolderId });
      }
    }

    setDragState(null);
    setDropTargetId(null);
    onDragStateChange(null, null);
  }, [dragState, fileStructure, moveFile, onDragStateChange, clearAutoExpandTimer]);

  const handleDragCancel = useCallback(() => {
    clearAutoExpandTimer();
    lastHoveredFolderRef.current = null;
    setDragState(null);
    setDropTargetId(null);
    onDragStateChange(null, null);
  }, [onDragStateChange, clearAutoExpandTimer]);

  const handleConfirmMove = useCallback(() => {
    if (pendingMove) {
      moveFile({ nodeId: pendingMove.nodeId, newParentId: pendingMove.targetFolderId });
      setPendingMove(null);
    }
  }, [pendingMove, moveFile]);

  const handleCancelMove = useCallback(() => {
    setPendingMove(null);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {dragState && (
          <div className="bg-secondary border-border flex items-center gap-2 rounded border px-3 py-1.5 text-sm shadow-lg">
            {dragState.nodeType === 'folder' ? (
              <FolderIcon className="text-muted-foreground h-4 w-4" />
            ) : (
              <FileIcon className="text-muted-foreground h-4 w-4" />
            )}
            <span>{dragState.nodeName}</span>
          </div>
        )}
      </DragOverlay>
      <MoveConfirmDialogComponent
        open={!!pendingMove}
        fileName={pendingMove?.nodeName ?? ''}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />
    </DndContext>
  );
};

export default FileTreeDndContextComponent;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/files/components/file-tree-dnd-context.component.tsx
git commit -m "feat(files): add FileTreeDndContext with DragOverlay, auto-expand, edge scroll"
```

---

## Task 7: Update FileTreeComponent with Draggable/Droppable

**Files:**
- Modify: `src/features/files/components/file-tree.component.tsx`

**Step 1: Add useDraggable and useDroppable hooks**

Replace the entire file with:

```typescript
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
 * - **Files**: Click to select, double-click to open in editor, draggable
 * - **Folders**: Click to select, click chevron to toggle, draggable and droppable
 * - **Context menus**: Right-click for actions (Rename, Delete, New File, New Folder)
 * - **Drag highlighting**: Folder + contents highlight when valid drop target
 *
 * @see FileTreeContext - Provides all shared state and callbacks
 * @see FileTreeDndContextComponent - Provides drag/drop context
 */

'use client';

import type { TreeNode } from '@/models/user-file-tree.model';
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
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

  const isOpen = openFolderIds.includes(node.id);
  const isFileOpen = node.type === 'file' && openFileIds?.has(node.id);
  const { openFile } = useOpenFilesActions();

  // Check if this node or any ancestor is the drop target (for highlighting)
  const isDropTarget = dropTargetFolderId === node.id;
  const isWithinDropTarget = dropTargetFolderId === parentId;
  const shouldHighlight = isDropTarget || isWithinDropTarget;

  // Check if this is the dragged node
  const isDragging = draggedNodeId === node.id;

  // Draggable setup
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

  // Droppable setup (only for folders)
  const dropData: FileDropData = { folderId: node.id };

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.id}`,
    data: dropData,
    disabled: node.type !== 'folder'
  });

  /**
   * Initiate HTML5 drag with file data in custom MIME type.
   * This allows dropping files onto editor tab bars.
   */
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(FILE_TREE_MIME_TYPE, JSON.stringify({ fileId: node.id, fileName: node.name }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Combine refs for folders (both draggable and droppable)
  const setRefs = (el: HTMLElement | null) => {
    setDragRef(el);
    if (node.type === 'folder') {
      setDropRef(el);
    }
  };

  // Highlight styles
  const highlightClass = shouldHighlight && !isDragging ? 'bg-accent/50' : '';
  const draggingClass = isDndKitDragging ? 'opacity-50' : '';

  // Render a file node (leaf in the tree)
  if (node.type === 'file') {
    const newNodeParentId = parentId ?? node.id;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setDragRef}
            {...dragAttributes}
            {...dragListeners}
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
          >
            <FileIcon className={`h-4 w-4 shrink-0 ${isFileOpen ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
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

  // For root folder, render children directly without showing the root itself
  if (isRoot && node.type === 'folder') {
    return (
      <div ref={setDropRef} className={highlightClass}>
        {node.children &&
          sortChildren(node.children).map(child => <FileTreeComponent key={child.id} node={child} depth={0} parentId={node.id} />)}
      </div>
    );
  }

  // Render a folder node
  return (
    <div className={highlightClass}>
      <Collapsible open={isOpen} onOpenChange={() => onToggleFolder(node.id)}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <CollapsibleTrigger
              ref={setRefs}
              {...dragAttributes}
              {...dragListeners}
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
            >
              {isOpen ? <ChevronDownIcon className="h-4 w-4 shrink-0" /> : <ChevronRightIcon className="h-4 w-4 shrink-0" />}
              {isOpen ? (
                <FolderOpenIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              )}
              <span className="text-sm font-medium">{node.name}</span>
            </CollapsibleTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onAddFile(node.id)}>New File</ContextMenuItem>
            <ContextMenuItem onClick={() => onAddFolder(node.id)}>New Folder</ContextMenuItem>
            <ContextMenuItem onClick={() => onRename(node)}>Rename</ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(node)}>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <CollapsibleContent>
          {node.children &&
            sortChildren(node.children).map(child => <FileTreeComponent key={child.id} node={child} depth={depth + 1} parentId={node.id} />)}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default FileTreeComponent;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build may fail due to FilesComponent not providing drag state yet

**Step 3: Commit**

```bash
git add src/features/files/components/file-tree.component.tsx
git commit -m "feat(files): add drag/drop capabilities to FileTreeComponent"
```

---

## Task 8: Update FilesComponent to Wire Everything Together

**Files:**
- Modify: `src/features/files/components/files.component.tsx`

**Step 1: Integrate DndContext and viewport ref**

Replace the entire file with:

```typescript
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
 * - Drag and drop context for moving files/folders
 *
 * "Select Opened Files" feature:
 * When enabled, clicking a tab in the editor will reveal and select that file
 * in the file tree. This helps users locate the file they're currently editing.
 * When the toggle is turned ON, it immediately reveals the currently active file.
 *
 * @see FileTreeContext - Context for sharing state with nested FileTreeComponents
 * @see FileTreeComponent - Renders individual nodes in the tree
 * @see FileTreeDndContextComponent - Provides drag/drop functionality
 */

'use client';

import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronsDownUp, ChevronsUpDown, FilePlus, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import type { TreeNode } from '@/models/user-file-tree.model';
import { useFileActions, useFileStructure, useOpenFolderIds, useSelectedFileId } from '@/stores/files/files.selector';
import { useOpenFileIds, useLastFocusedGroupId, useEditorGroup } from '@/stores/open-files/open-files.selector';
import { useSelectOpenedFiles, useUiActions } from '@/stores/ui/ui.selector';
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

  // Viewport ref for programmatic scrolling during drag
  const viewportRef = useRef<HTMLDivElement>(null);

  // Drag state for highlighting
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  const handleDragStateChange = useCallback((draggedId: string | null, dropTargetId: string | null) => {
    setDraggedNodeId(draggedId);
    setDropTargetFolderId(dropTargetId);
  }, []);

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

  // Context value for FileTreeProvider
  const fileTreeContextValue = {
    selectedId,
    openFolderIds,
    openFileIds,
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

  /**
   * Handle context menu on empty space - deselect any selected node
   */
  const handleEmptySpaceContextMenu = () => {
    setSelectedFileId(null);
  };

  // Empty space drop zone for dropping to root
  const dropData: FileDropData = { folderId: fileStructure.id };
  const { setNodeRef: setEmptyDropRef } = useDroppable({
    id: 'drop-empty-space',
    data: dropData
  });

  return (
    <MainPanelsComponent title="Files" pos={pos} tools={toolbarButtons}>
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
                <div ref={setEmptyDropRef} className="min-h-full" onContextMenu={handleEmptySpaceContextMenu}>
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
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/files/components/files.component.tsx
git commit -m "feat(files): integrate drag-drop context and viewport ref in FilesComponent"
```

---

## Task 9: Test and Fix Issues

**Step 1: Run dev server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Manual testing checklist**

Test each scenario:
- [ ] Drag a file onto a folder - should highlight folder + contents, move on drop
- [ ] Drag a folder onto another folder - same behavior
- [ ] Drag onto collapsed folder - should auto-expand after ~700ms
- [ ] Drag to empty space below items - should move to root
- [ ] Drag near edges - should auto-scroll
- [ ] Drag onto self - should show not-allowed, no highlight
- [ ] Drag onto current parent - should show not-allowed, no highlight
- [ ] Drag folder onto its descendant - should show not-allowed
- [ ] Drag file with duplicate name - should show confirmation dialog
- [ ] Drag file to editor tabs - should still work (HTML5 drag)

**Step 3: Fix any issues found**

Address bugs discovered during manual testing.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(files): complete file explorer drag-drop implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add constants | `src/features/files/const.ts` |
| 2 | Extend ScrollArea | `src/components/ui/scroll-area.tsx` |
| 3 | Add drag state to context | `src/features/files/components/file-tree-context.tsx` |
| 4 | Create validation utils | `src/features/files/utils/drag-drop.utils.ts` |
| 5 | Create confirm dialog | `src/features/files/components/move-confirm-dialog.component.tsx` |
| 6 | Create DnD context | `src/features/files/components/file-tree-dnd-context.component.tsx` |
| 7 | Update FileTreeComponent | `src/features/files/components/file-tree.component.tsx` |
| 8 | Update FilesComponent | `src/features/files/components/files.component.tsx` |
| 9 | Test and fix | All files |
