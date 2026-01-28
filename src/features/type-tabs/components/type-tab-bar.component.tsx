'use client';

/**
 * Type Tab Bar Component
 *
 * Container for chart tabs with drag-drop reordering support.
 * Blocks file drops from the file tree (charts and files don't mix).
 *
 * @remarks
 * Uses dnd-kit for tab reordering within the charts panel.
 * Also listens for HTML5 drag events to block file tree drops.
 */

import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import TypeTab from './type-tab.component';
import { useChartTabs, useChartActiveTabId, useTypeTabActions } from '@/stores/type-tabs/type-tabs.selector';
import { FILE_TREE_MIME_TYPE, DRAG_ACTIVATION_DISTANCE } from '@/features/editor/const';
import { cn } from '@/lib/utils';

const TypeTabBar = () => {
  const tabs = useChartTabs();
  const activeTabId = useChartActiveTabId();
  const { activateChartTab, closeChartTab, closeAllChartTabs, reorderTab } = useTypeTabActions();
  const [isFileTreeDragOver, setIsFileTreeDragOver] = useState(false);

  // Configure pointer sensor with activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE
      }
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tabs.findIndex(t => t.id === active.id);
    const newIndex = tabs.findIndex(t => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderTab('charts', active.id as string, newIndex);
    }
  };

  // Block file tree drops on charts panel
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FILE_TREE_MIME_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'none';
      setIsFileTreeDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFileTreeDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FILE_TREE_MIME_TYPE)) {
      e.preventDefault();
      setIsFileTreeDragOver(false);
    }
  };

  if (tabs.length === 0) {
    return null;
  }

  const sortableIds = tabs.map(t => t.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <div
          className={cn(
            'border-border flex items-center overflow-x-auto border-b',
            isFileTreeDragOver && 'ring-destructive/50 ring-2 ring-inset'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {tabs.map(tab => (
            <TypeTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={activateChartTab}
              onClose={closeChartTab}
              onCloseAll={closeAllChartTabs}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TypeTabBar;
