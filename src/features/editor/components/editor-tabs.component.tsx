/**
 * Editor Tabs Component
 *
 * Tab bar with overflow handling and dropdown menu.
 */

'use client';

import React from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import EditorTabComponent from '@/features/editor/components/editor-tab.component';
import { EditorDragContext } from '@/features/editor/components/editor-dnd-context.component';

interface Props {
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorTabsComponent = ({ groupId, rowIndex, groupIndex }: Props) => {
  const group = useEditorGroup(groupId);
  const { setActiveFile, closeAllFilesInGroup, openFile } = useOpenFilesActions();
  const activeDragState = React.useContext(EditorDragContext);

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [fileTreeDropIndex, setFileTreeDropIndex] = React.useState<number | null>(null);

  const files = group?.files ?? [];
  const activeFileId = group?.activeFileId ?? null;

  // Track if any drag is happening (to disable animations and use indicator instead)
  const isDragging = activeDragState !== null;

  // Check if we should show drop indicator in this group
  const isDropTarget = activeDragState && activeDragState.overGroupId === groupId;
  const dropIndex = isDropTarget ? activeDragState.overIndex : null;
  const showEndIndicator = isDropTarget && dropIndex === files.length;

  const sortableItems = React.useMemo(() => {
    return files.map(f => f.id);
  }, [files]);

  // Droppable zone at end of tabs for cross-group drops
  const endDropId = `${groupId}-end`;
  const { setNodeRef: setEndDropRef, isOver: isOverEnd } = useDroppable({
    id: endDropId,
    data: {
      fileId: null,
      fileName: null,
      fromGroupId: groupId,
      isEndZone: true,
      endIndex: files.length
    }
  });

  // Check for overflow
  React.useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const isOverflowing = container.scrollWidth > container.clientWidth;
      setHasOverflow(isOverflowing);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [files]);

  const handleActivate = (fileId: string) => {
    setActiveFile(fileId, groupId);
  };

  const handleCloseAll = () => {
    closeAllFilesInGroup(groupId);
  };

  // Calculate drop index based on mouse position relative to tabs
  const calculateDropIndex = (clientX: number): number => {
    const container = tabsContainerRef.current;
    if (!container) return files.length;

    const tabs = container.querySelectorAll('[data-tab-index]');
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i] as HTMLElement;
      const rect = tab.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      if (clientX < midpoint) {
        return i;
      }
    }
    return files.length;
  };

  // Handle file tree drag over
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-file-tree')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const dropIndex = calculateDropIndex(e.clientX);
      setFileTreeDropIndex(dropIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFileTreeDropIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const insertIndex = fileTreeDropIndex;
    setFileTreeDropIndex(null);

    const data = e.dataTransfer.getData('application/x-file-tree');
    if (data) {
      try {
        const { fileId, fileName } = JSON.parse(data);
        openFile(fileId, fileName, groupId, insertIndex ?? undefined);
      } catch {
        // Invalid data, ignore
      }
    }
  };

  // Empty group - show drop zone only
  if (files.length === 0) {
    return (
      <div
        className={`bg-muted/30 flex h-9 items-center border-b ${fileTreeDropIndex !== null ? 'ring-primary ring-2 ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">Drop files here</div>
      </div>
    );
  }

  // Check if file tree drop indicator should show at end
  const showFileTreeEndIndicator = fileTreeDropIndex === files.length;

  return (
    <div
      className="bg-muted/30 flex h-9 items-center border-b"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tabs container with horizontal scroll */}
      <div ref={tabsContainerRef} className="scrollbar-none flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <SortableContext items={sortableItems} strategy={horizontalListSortingStrategy}>
          {files.map((file, index) => (
            <EditorTabComponent
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              groupId={groupId}
              rowIndex={rowIndex}
              groupIndex={groupIndex}
              disableTransform={isDragging}
              tabIndex={index}
              showDropIndicator={dropIndex === index || fileTreeDropIndex === index}
            />
          ))}
          {/* Droppable end zone */}
          <div ref={setEndDropRef} className="relative flex min-w-8 flex-1 items-center self-stretch">
            {(isOverEnd || showEndIndicator || showFileTreeEndIndicator) && (
              <div className="bg-primary absolute top-1 bottom-1 left-0 w-0.5 rounded-full" />
            )}
          </div>
        </SortableContext>
      </div>

      {/* Overflow dropdown - shows all files */}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="border-border h-9 w-9 rounded-none border-l">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {files.map(file => (
              <DropdownMenuItem key={file.id} onClick={() => handleActivate(file.id)}>
                {file.id === activeFileId && <span className="mr-2">●</span>}
                {file.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Group menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCloseAll}>Close All Tabs</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EditorTabsComponent;
