/**
 * Editor Tab Component
 *
 * Individual draggable tab with context menu for close/move operations.
 *
 * @remarks
 * Each tab is a draggable item (via dnd-kit's useSortable) and a context menu trigger.
 *
 * Key behaviors:
 * - Click: Activate this tab (show its content)
 * - Middle-click: Close tab (standard browser convention)
 * - Drag: Reorder within group or move to another group
 * - Right-click: Context menu with Close/Move options
 *
 * The context menu dynamically shows move options based on layout state:
 * - "Move Left" if an adjacent group exists to the left
 * - "Split and Move Left" if no left group exists (will create one)
 * - Move options hidden if constraints prevent the move (e.g., single-file groups can't split)
 *
 * @see useCanMoveInDirection - Determines which move options are available
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { OpenFile, GroupId } from '@/stores/open-files/open-files.store';
import { useOpenFilesActions, useCanMoveInDirection, useLastFocusedGroupId } from '@/stores/open-files/open-files.selector';
import { useFileActions } from '@/stores/files/files.selector';
import { useSelectOpenedFiles } from '@/stores/ui/ui.selector';
import { Button } from '@/components/ui/button';
import { MoveDirection } from '@/features/editor/const';

/**
 * Human-readable labels for move directions.
 * Defined outside component to avoid object recreation on each render.
 */
const DIRECTION_LABELS: Record<MoveDirection, string> = {
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down'
};

interface Props {
  file: OpenFile;
  isActive: boolean;
  groupId: GroupId;
  /** Disable CSS transform during drag to prevent visual glitches */
  disableTransform?: boolean;
  /** Position in tab list - used for drop index calculation */
  tabIndex: number;
  /** Show vertical line before this tab indicating drop position */
  showDropIndicator?: boolean;
}

const EditorTabComponent = ({ file, isActive, groupId, disableTransform, tabIndex, showDropIndicator }: Props) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  const { closeFile, setActiveFile, moveFileToNewGroup, closeAllFilesInGroup, closeOtherFiles } = useOpenFilesActions();
  const { revealFile } = useFileActions();
  const selectOpenedFiles = useSelectOpenedFiles();
  const lastFocusedGroupId = useLastFocusedGroupId();
  // Visual distinction: Active tab in the focused group gets a top highlight bar
  const isLastFocusedGroup = lastFocusedGroupId === groupId;

  // SSR Guard: dnd-kit's useSortable generates IDs that differ server vs client.
  // We disable drag functionality until after first client render.
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
    data: {
      fileId: file.id,
      fileName: file.name,
      fromGroupId: groupId
    },
    disabled: !isMounted
  });

  const style = isMounted
    ? {
        transform: disableTransform ? undefined : CSS.Transform.toString(transform),
        transition: disableTransform ? undefined : transition,
        opacity: isDragging ? 0.5 : 1
      }
    : undefined;

  const canMoveLeft = useCanMoveInDirection(groupId, 'left');
  const canMoveRight = useCanMoveInDirection(groupId, 'right');
  const canMoveUp = useCanMoveInDirection(groupId, 'up');
  const canMoveDown = useCanMoveInDirection(groupId, 'down');

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeFile(file.id, groupId);
  };

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      closeFile(file.id, groupId);
    }
  };

  /**
   * Activate this tab and optionally sync with file tree.
   * When "Select Opened Files" toggle is ON, also reveals file in explorer.
   */
  const handleActivate = () => {
    setActiveFile(file.id, groupId);
    if (selectOpenedFiles) {
      revealFile(file.id);
    }
  };

  const handleMove = (direction: MoveDirection) => {
    moveFileToNewGroup(file.id, groupId, direction);
  };

  // Get menu label based on whether it creates a new group
  const getMoveLabel = (direction: MoveDirection, info: { canMove: boolean; isNewGroup: boolean }) => {
    if (info.isNewGroup) {
      return `Split and Move ${DIRECTION_LABELS[direction]}`;
    }
    return `Move ${DIRECTION_LABELS[direction]}`;
  };

  const hasAnyMoveOption = canMoveLeft.canMove || canMoveRight.canMove || canMoveUp.canMove || canMoveDown.canMove;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={isMounted ? setNodeRef : undefined}
          style={style}
          data-tab-index={tabIndex}
          {...(isMounted ? attributes : {})}
          {...(isMounted ? listeners : {})}
          className={cn(
            'group border-border relative flex h-9 cursor-pointer items-center gap-2 border-r px-3 text-sm transition-colors',
            isActive ? 'bg-secondary text-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            isDragging && 'z-50'
          )}
          onClick={handleActivate}
          onMouseDown={handleMiddleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Drop indicator line - shows before this tab */}
          {showDropIndicator && <div className="bg-primary absolute top-1 bottom-1 -left-0.5 w-0.5 rounded-full" />}

          {/* Active indicator - only show on last focused group */}
          {isActive && isLastFocusedGroup && <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />}

          {/* File name */}
          <span className="truncate">{file.name}</span>

          {/* Close button - shows on hover or when active */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className={cn('h-5 w-5 opacity-0 transition-colors', (isHovered || isActive) && 'opacity-100')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => closeFile(file.id, groupId)}>Close Tab</ContextMenuItem>
        <ContextMenuItem onClick={() => closeOtherFiles(file.id, groupId)}>Close Others</ContextMenuItem>
        <ContextMenuItem onClick={() => closeAllFilesInGroup(groupId)}>Close All Tabs</ContextMenuItem>

        {hasAnyMoveOption && (
          <>
            <ContextMenuSeparator />
            {canMoveLeft.canMove && (
              <ContextMenuItem onClick={() => handleMove('left')}>{getMoveLabel('left', canMoveLeft)}</ContextMenuItem>
            )}
            {canMoveRight.canMove && (
              <ContextMenuItem onClick={() => handleMove('right')}>{getMoveLabel('right', canMoveRight)}</ContextMenuItem>
            )}
            {canMoveUp.canMove && <ContextMenuItem onClick={() => handleMove('up')}>{getMoveLabel('up', canMoveUp)}</ContextMenuItem>}
            {canMoveDown.canMove && (
              <ContextMenuItem onClick={() => handleMove('down')}>{getMoveLabel('down', canMoveDown)}</ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default EditorTabComponent;
