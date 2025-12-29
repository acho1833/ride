/**
 * Editor DnD Context Component
 *
 * Provides drag-and-drop context for tab reordering and moving between groups.
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

interface DragData {
  fileId: string;
  fileName: string;
  fromGroupId: string;
}

interface EndZoneData {
  fileId: null;
  fileName: null;
  fromGroupId: string;
  isEndZone: true;
  endIndex: number;
}

type OverData = DragData | EndZoneData;

/** Active drag state for cross-group animations */
export interface ActiveDragState {
  fileId: string;
  fileName: string;
  fromGroupId: string;
  overGroupId: string | null;
  overIndex: number | null;
}

/** Context for sharing drag state with tab components */
export const EditorDragContext = React.createContext<ActiveDragState | null>(null);

interface Props {
  children: React.ReactNode;
}

const EditorDndContextComponent = ({ children }: Props) => {
  const [activeDragState, setActiveDragState] = React.useState<ActiveDragState | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const { reorderFile, moveFileToGroup } = useOpenFilesActions();

  // Only render DnD context on client to avoid hydration mismatch
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
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

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!activeDragState) return;

    const overData = over?.data.current as OverData | undefined;
    const overGroupId = overData?.fromGroupId ?? null;

    // Check if over end zone or sortable item
    let overIndex: number | null = null;
    if (overData && 'isEndZone' in overData && overData.isEndZone) {
      overIndex = overData.endIndex;
    } else {
      const overSortable = over?.data.current?.sortable;
      overIndex = typeof overSortable?.index === 'number' ? overSortable.index : null;
    }

    // Update if target group or index changed
    if (overGroupId !== activeDragState.overGroupId || overIndex !== activeDragState.overIndex) {
      setActiveDragState(prev => (prev ? { ...prev, overGroupId, overIndex } : null));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragState(null);

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

    if (fromGroupId === toGroupId) {
      // Reorder within same group
      if (insertIndex !== undefined) {
        reorderFile(fileId, fromGroupId, insertIndex);
      }
    } else {
      // Move to different group
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
