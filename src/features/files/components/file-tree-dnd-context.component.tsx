// src/features/files/components/file-tree-dnd-context.component.tsx

'use client';

import React, { useState, useRef, useCallback } from 'react';
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
import type { FolderNode } from '@/models/user-file-tree.model';
import { FILE_DND_CONFIG } from '@/features/files/const';
import { isValidDropTarget, hasChildWithName } from '@/features/files/utils/drag-drop.utils';
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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoveredFolderRef = useRef<string | null>(null);

  const { mutate: moveFile } = useFileMoveMutation();

  // SSR Guard: dnd-kit generates unique IDs that differ between server and client,
  // causing hydration mismatches. We defer DnD setup until after first client render.
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cleanup auto-expand timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as FileDragData | undefined;
      if (data) {
        setDragState({
          nodeId: data.nodeId,
          nodeName: data.nodeName,
          nodeType: data.nodeType
        });
        onDragStateChange(data.nodeId, null);
      }
    },
    [onDragStateChange]
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
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
    },
    [
      dragState,
      dropTargetId,
      fileStructure,
      openFolderIds,
      onToggleFolder,
      viewportRef,
      onDragStateChange,
      clearAutoExpandTimer
    ]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      clearAutoExpandTimer();
      lastHoveredFolderRef.current = null;

      const { over } = event;
      const overData = over?.data.current as FileDropData | undefined;
      const targetFolderId = overData?.folderId;

      if (
        dragState &&
        targetFolderId &&
        isValidDropTarget(fileStructure, dragState.nodeId, targetFolderId)
      ) {
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
    },
    [dragState, fileStructure, moveFile, onDragStateChange, clearAutoExpandTimer]
  );

  const handleDragCancel = useCallback(() => {
    clearAutoExpandTimer();
    lastHoveredFolderRef.current = null;
    setDragState(null);
    setDropTargetId(null);
    onDragStateChange(null, null);
  }, [onDragStateChange, clearAutoExpandTimer]);

  const handleConfirmMove = useCallback(() => {
    if (pendingMove) {
      moveFile({
        nodeId: pendingMove.nodeId,
        newParentId: pendingMove.targetFolderId,
        force: true
      });
      setPendingMove(null);
    }
  }, [pendingMove, moveFile]);

  const handleCancelMove = useCallback(() => {
    setPendingMove(null);
  }, []);

  // Render children without DnD context during SSR to avoid hydration mismatch
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
