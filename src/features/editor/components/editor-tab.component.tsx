/**
 * Editor Tab Component
 *
 * Single tab with dynamic context menu based on available move directions.
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { OpenFile, GroupId } from '@/stores/open-files/open-files.store';
import { useOpenFilesActions, useCanMoveInDirection } from '@/stores/open-files/open-files.selector';
import { Button } from '@/components/ui/button';
import { MoveDirection } from '@/features/editor/const';

interface Props {
  file: OpenFile;
  isActive: boolean;
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorTabComponent = ({ file, isActive, groupId }: Props) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const { closeFile, setActiveFile, moveFileToNewGroup, closeAllFilesInGroup } = useOpenFilesActions();

  const canMoveLeft = useCanMoveInDirection(groupId, 'left');
  const canMoveRight = useCanMoveInDirection(groupId, 'right');
  const canMoveUp = useCanMoveInDirection(groupId, 'up');
  const canMoveDown = useCanMoveInDirection(groupId, 'down');

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeFile(file.id, groupId);
  };

  const handleActivate = () => {
    setActiveFile(file.id, groupId);
  };

  const handleMove = (direction: MoveDirection) => {
    moveFileToNewGroup(file.id, groupId, direction);
  };

  // Get menu label based on whether it creates a new group
  const getMoveLabel = (direction: MoveDirection, info: { canMove: boolean; isNewGroup: boolean }) => {
    const directionLabels: Record<MoveDirection, string> = {
      left: 'Left',
      right: 'Right',
      up: 'Up',
      down: 'Down',
    };

    if (info.isNewGroup) {
      return `Split and Move ${directionLabels[direction]}`;
    }
    return `Move ${directionLabels[direction]}`;
  };

  const hasAnyMoveOption = canMoveLeft.canMove || canMoveRight.canMove || canMoveUp.canMove || canMoveDown.canMove;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            'group border-border relative flex h-9 cursor-pointer items-center gap-2 border-r px-3 text-sm transition-colors',
            isActive ? 'bg-secondary text-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={handleActivate}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Active indicator */}
          {isActive && <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />}

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

        {hasAnyMoveOption && (
          <>
            <ContextMenuSeparator />
            {canMoveLeft.canMove && (
              <ContextMenuItem onClick={() => handleMove('left')}>
                {getMoveLabel('left', canMoveLeft)}
              </ContextMenuItem>
            )}
            {canMoveRight.canMove && (
              <ContextMenuItem onClick={() => handleMove('right')}>
                {getMoveLabel('right', canMoveRight)}
              </ContextMenuItem>
            )}
            {canMoveUp.canMove && (
              <ContextMenuItem onClick={() => handleMove('up')}>
                {getMoveLabel('up', canMoveUp)}
              </ContextMenuItem>
            )}
            {canMoveDown.canMove && (
              <ContextMenuItem onClick={() => handleMove('down')}>
                {getMoveLabel('down', canMoveDown)}
              </ContextMenuItem>
            )}
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => closeAllFilesInGroup(groupId)}>Close All Tabs</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default EditorTabComponent;
