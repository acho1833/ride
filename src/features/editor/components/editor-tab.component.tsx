/**
 * Editor Tab Component
 *
 * Single tab component with IntelliJ-style design.
 * Shows close button on hover and supports context menu.
 */

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { EditorGroup, OpenFile } from '@/stores/open-files/open-files.store';

interface Props {
  file: OpenFile;
  isActive: boolean;
  group: EditorGroup;
  onActivate: (fileId: string) => void;
  onClose: (fileId: string) => void;
  onMoveToOtherGroup: (fileId: string) => void;
  onCloseAll: () => void;
}

const EditorTab = ({ file, isActive, group, onActivate, onClose, onMoveToOtherGroup, onCloseAll }: Props) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(file.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            'group border-border relative flex h-9 cursor-pointer items-center gap-2 border-r px-3 text-sm transition-colors',
            isActive ? 'bg-secondary text-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => onActivate(file.id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Active indicator */}
          {isActive && <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />}

          {/* File name */}
          <span className="truncate">{file.name}</span>

          {/* Close button - shows on hover or when active */}
          <button
            onClick={handleClose}
            className={cn(
              'hover:bg-muted-foreground/20 h-5 w-5 items-center justify-center rounded-sm opacity-0 transition-colors',
              (isHovered || isActive) && 'opacity-100'
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => onClose(file.id)}>Close Tab</ContextMenuItem>
        <ContextMenuItem onClick={() => onMoveToOtherGroup(file.id)}>Move to {group === 'left' ? 'Right' : 'Left'} Group</ContextMenuItem>
        <ContextMenuItem onClick={onCloseAll}>Close All Tabs</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default EditorTab;
