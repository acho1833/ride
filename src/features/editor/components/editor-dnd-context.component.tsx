/**
 * Editor DnD Context Component
 *
 * Provides drag-and-drop context for tab reordering and cross-group moves.
 *
 * @remarks
 * Architecture Decision: We use dnd-kit for tab operations (not native HTML5 drag/drop)
 * because it provides better animation support, sortable lists, and accessibility.
 * File tree drag uses native HTML5 drag/drop separately to avoid conflicts.
 *
 * Key behaviors:
 * - Tracks active drag state and broadcasts via EditorDragContext
 * - Uses pointerWithin collision detection for accurate drop targeting
 * - Handles both reorder (same group) and move (cross-group) operations
 * - Defers DnD initialization until client-side to prevent SSR hydration errors
 *
 * @see EditorTabComponent - Individual draggable tabs
 * @see EditorTabsComponent - Drop zones and sortable context
 */

'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { DRAG_ACTIVATION_DISTANCE } from '@/features/editor/const';

/** Data attached to draggable tab items */
interface DragData {
  fileId: string;
  fileName: string;
  fromGroupId: string;
}

/**
 * Data for the invisible "end zone" droppable at the end of each tab bar.
 * Allows dropping after the last tab without hitting a specific tab.
 */
interface EndZoneData {
  fileId: null;
  fileName: null;
  fromGroupId: string;
  isEndZone: true;
  /** Index where file should be inserted (after last tab) */
  endIndex: number;
}

type OverData = DragData | EndZoneData;

/**
 * Drag state shared with child components via context.
 * Used to show drop indicators in the correct position.
 */
export interface ActiveDragState {
  fileId: string;
  fileName: string;
  fromGroupId: string;
  /** Which group the cursor is currently over (null if outside all groups) */
  overGroupId: string | null;
  /** Index position where file would be inserted */
  overIndex: number | null;
}

/**
 * Context for sharing active drag state with tab components.
 * Null when no drag is in progress.
 */
export const EditorDragContext = React.createContext<ActiveDragState | null>(null);

interface Props {
  children: React.ReactNode;
}

const EditorDndContextComponent = ({ children }: Props) => {
  const [activeDragState, setActiveDragState] = React.useState<ActiveDragState | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const { reorderFile, moveFileToGroup } = useOpenFilesActions();

  // SSR Guard: dnd-kit generates unique IDs that differ between server and client,
  // causing hydration mismatches. We defer DnD setup until after first client render.
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Configure drag sensors with activation threshold to distinguish
  // intentional drags from accidental clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragData | undefined;
    if (data) {
      setActiveDragState({
        fileId: data.fileId,
        fileName: data.fileName,
        fromGroupId: data.fromGroupId,
        overGroupId: data.fromGroupId, // Start in source group
        overIndex: null
      });
    }
  };

  /**
   * Track cursor position during drag to update drop indicators.
   * Called frequently as user moves cursor between tabs and groups.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!activeDragState) return;

    const overData = over?.data.current as OverData | undefined;
    const overGroupId = overData?.fromGroupId ?? null;

    // Determine insert index: end zones store it directly, sortable items use their position
    let overIndex: number | null = null;
    if (overData && 'isEndZone' in overData && overData.isEndZone) {
      overIndex = overData.endIndex;
    } else {
      const overSortable = over?.data.current?.sortable;
      overIndex = typeof overSortable?.index === 'number' ? overSortable.index : null;
    }

    // Only update state if position actually changed to avoid unnecessary re-renders
    if (overGroupId !== activeDragState.overGroupId || overIndex !== activeDragState.overIndex) {
      setActiveDragState(prev => (prev ? { ...prev, overGroupId, overIndex } : null));
    }
  };

  /**
   * Finalize the drag operation: either reorder within group or move across groups.
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragState(null);

    // No valid drop target or dropped on self - do nothing
    if (!over || active.id === over.id) {
      return;
    }

    const dragData = active.data.current as DragData | undefined;
    const overData = over.data.current as OverData | undefined;

    if (!dragData || !overData) {
      return;
    }

    const fileId = dragData.fileId;
    const fromGroupId = dragData.fromGroupId;
    const toGroupId = overData.fromGroupId;

    // Get insert index - from end zone or sortable data
    let insertIndex: number | undefined;
    if ('isEndZone' in overData && overData.isEndZone) {
      insertIndex = overData.endIndex;
    } else {
      const overSortable = over.data.current?.sortable;
      insertIndex = typeof overSortable?.index === 'number' ? overSortable.index : undefined;
    }

    // Same group = reorder, different group = move
    if (fromGroupId === toGroupId) {
      if (insertIndex !== undefined) {
        reorderFile(fileId, fromGroupId, insertIndex);
      }
    } else {
      moveFileToGroup(fileId, fromGroupId, toGroupId, insertIndex);
    }
  };

  // Render children without DnD context during SSR to avoid hydration mismatch
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <EditorDragContext.Provider value={activeDragState}>{children}</EditorDragContext.Provider>
      <DragOverlay>
        {activeDragState && (
          <div className="bg-secondary border-border rounded border px-3 py-1 text-sm shadow-lg">{activeDragState.fileName}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default EditorDndContextComponent;
