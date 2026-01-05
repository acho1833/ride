/**
 * Editor Tabs Component
 *
 * Tab bar for a single editor group with drag-drop support, overflow handling, and dropdown menus.
 *
 * @remarks
 * This component manages two separate drag-drop systems:
 * 1. **dnd-kit** (SortableContext) - For tab-to-tab drag operations within/across groups
 * 2. **Native HTML5 DnD** - For file tree to tab bar drops
 *
 * These two systems are kept separate because:
 * - dnd-kit provides smooth animations and collision detection for tab reordering
 * - HTML5 DnD is simpler for one-way drops from external sources (file tree)
 * - Using custom MIME type (FILE_TREE_MIME_TYPE) prevents conflicts between the two
 *
 * Drop indicator logic:
 * - `dropIndex` from EditorDragContext tracks dnd-kit (tab) drags
 * - `fileTreeDropIndex` local state tracks HTML5 (file tree) drags
 * - Both use the same visual indicator but are mutually exclusive
 *
 * @see EditorDragContext - Provides dnd-kit drag state
 * @see FILE_TREE_MIME_TYPE - Custom MIME type for file tree operations
 */

'use client';

import React from 'react';
import { ChevronDown, MoreVertical, X } from 'lucide-react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import EditorTabComponent from '@/features/editor/components/editor-tab.component';
import { EditorDragContext } from '@/features/editor/components/editor-dnd-context.component';
import { FILE_TREE_MIME_TYPE } from '@/features/editor/const';

interface Props {
  groupId: GroupId;
}

const EditorTabsComponent = ({ groupId }: Props) => {
  const group = useEditorGroup(groupId);
  const { setActiveFile, closeFile, closeAllFilesInGroup, openFile } = useOpenFilesActions();
  const activeDragState = React.useContext(EditorDragContext);

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [hasHiddenTabs, setHasHiddenTabs] = React.useState(false);
  const [fileTreeDropIndex, setFileTreeDropIndex] = React.useState<number | null>(null);
  const [hiddenFileIds, setHiddenFileIds] = React.useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

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

  /**
   * Droppable zone at end of tabs for cross-group drops.
   *
   * @remarks
   * Without this end zone, users couldn't drop tabs at the END of another group's tab list.
   * The SortableContext only handles drops BETWEEN existing tabs. This invisible zone
   * extends from the last tab to the end of the container.
   *
   * The `isEndZone: true` and `endIndex` in data help handleDragEnd in EditorDndContext
   * know this is an append operation, not an insert.
   */
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

  // Check for fully hidden tabs using ResizeObserver (catches both window and panel resizes)
  React.useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const checkHiddenTabs = () => {
      const containerRect = container.getBoundingClientRect();
      const tabs = container.querySelectorAll('[data-tab-index]');
      let hasHidden = false;

      tabs.forEach(tab => {
        const tabRect = tab.getBoundingClientRect();
        // Tab is fully hidden if completely outside container bounds
        if (tabRect.right <= containerRect.left || tabRect.left >= containerRect.right) {
          hasHidden = true;
        }
      });

      setHasHiddenTabs(hasHidden);
    };

    checkHiddenTabs();
    const resizeObserver = new ResizeObserver(checkHiddenTabs);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [files]);

  const handleCloseAll = () => {
    closeAllFilesInGroup(groupId);
  };

  /**
   * Calculate which tabs are hidden (outside visible bounds).
   * Called when overflow dropdown opens to show only non-visible tabs.
   */
  const updateHiddenFiles = () => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const tabs = container.querySelectorAll('[data-tab-index]');
    const hidden = new Set<string>();

    tabs.forEach((tab, index) => {
      const tabRect = tab.getBoundingClientRect();
      const file = files[index];
      if (!file) return;

      // Tab is hidden if it's fully outside the container bounds
      const isHidden = tabRect.right <= containerRect.left || tabRect.left >= containerRect.right;
      if (isHidden) {
        hidden.add(file.id);
      }
    });

    setHiddenFileIds(hidden);
  };

  /**
   * Scroll tab into view and activate it.
   * Called when selecting a file from the overflow dropdown.
   * Closes the dropdown after selection.
   */
  const handleSelectHiddenFile = (fileId: string) => {
    setActiveFile(fileId, groupId);
    setIsDropdownOpen(false);

    // Find and scroll to the tab element
    const container = tabsContainerRef.current;
    if (!container) return;

    const tabs = container.querySelectorAll('[data-tab-index]');
    const fileIndex = files.findIndex(f => f.id === fileId);
    const tabElement = tabs[fileIndex] as HTMLElement | undefined;

    if (tabElement) {
      tabElement.scrollIntoView({ behavior: 'instant', inline: 'nearest', block: 'nearest' });
    }
  };

  /**
   * Close a file from the dropdown.
   * Keeps dropdown open unless no hidden files remain.
   */
  const handleCloseFromDropdown = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    closeFile(fileId, groupId);

    // Update hidden files and close dropdown if none remain
    setTimeout(() => {
      updateHiddenFiles();
      // Check if any hidden files remain (account for the one we just closed)
      const remainingHidden = files.filter(f => f.id !== fileId && hiddenFileIds.has(f.id));
      if (remainingHidden.length === 0) {
        setIsDropdownOpen(false);
      }
    }, 0);
  };

  /**
   * Calculate drop index based on mouse X position relative to tab midpoints.
   *
   * @remarks
   * Uses midpoint comparison to determine insertion point:
   * - If cursor is left of a tab's midpoint → insert before that tab
   * - If cursor is right of all midpoints → append at end
   *
   * This feels natural because the drop happens on whichever "side" of the tab
   * you're hovering over.
   *
   * @param clientX - Mouse X position from drag event
   * @returns Index where the dropped file should be inserted
   */
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

  /**
   * Handle HTML5 dragover for file tree drops.
   * Only responds to our custom MIME type to avoid interfering with dnd-kit.
   */
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FILE_TREE_MIME_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const dropIndex = calculateDropIndex(e.clientX);
      setFileTreeDropIndex(dropIndex);
    }
  };

  /**
   * Handle HTML5 dragleave - reset drop indicator.
   * Only resets when leaving the container entirely (not when moving between children).
   */
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFileTreeDropIndex(null);
    }
  };

  /**
   * Handle HTML5 drop for files dragged from file tree.
   *
   * @remarks
   * Type-safe parsing: We parse JSON as `unknown` first, then validate the shape
   * before using it. This prevents runtime errors if malformed data is dropped.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const insertIndex = fileTreeDropIndex;
    setFileTreeDropIndex(null);

    const data = e.dataTransfer.getData(FILE_TREE_MIME_TYPE);
    if (data) {
      try {
        const parsed: unknown = JSON.parse(data);
        // Validate parsed data has expected shape before using
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'fileId' in parsed &&
          'fileName' in parsed &&
          typeof (parsed as { fileId: unknown }).fileId === 'string' &&
          typeof (parsed as { fileName: unknown }).fileName === 'string'
        ) {
          const { fileId, fileName } = parsed as { fileId: string; fileName: string };
          openFile(fileId, fileName, groupId, insertIndex ?? undefined);
        }
      } catch {
        // Invalid JSON, ignore silently
      }
    }
  };

  // Empty group shows a placeholder drop zone. This can happen briefly during cleanup
  // transitions or when all tabs are closed but the group hasn't been removed yet.
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

      {/* Overflow dropdown - shows only hidden files */}
      {hasHiddenTabs && (
        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={open => {
            setIsDropdownOpen(open);
            if (open) updateHiddenFiles();
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="border-border h-9 w-9 rounded-none border-l">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {files
              .filter(file => hiddenFileIds.has(file.id))
              .map(file => (
                <DropdownMenuItem
                  key={file.id}
                  className="flex items-center justify-between gap-4"
                  onSelect={e => {
                    e.preventDefault();
                    handleSelectHiddenFile(file.id);
                  }}
                >
                  <span>{file.name}</span>
                  <button className="hover:bg-muted rounded p-0.5" onClick={e => handleCloseFromDropdown(e, file.id)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
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
