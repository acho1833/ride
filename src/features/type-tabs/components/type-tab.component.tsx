/**
 * Type Tab Component
 *
 * Single tab component with IntelliJ-style design.
 * Shows close button on hover and supports context menu.
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Tab } from '@/stores/type-tabs/type-tabs.store';
import { Button } from '@/components/ui/button';

interface Props {
  tab: Tab;
  isActive: boolean;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onCloseAll: () => void;
}

const TypeTab = ({ tab, isActive, onActivate, onClose, onCloseAll }: Props) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            'group border-border relative flex h-9 cursor-pointer items-center gap-2 border-r px-3 text-sm transition-colors',
            isActive ? 'bg-secondary text-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => onActivate(tab.id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Active indicator */}
          {isActive && <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />}

          {/* Tab name */}
          <span className="truncate">{tab.name}</span>

          {/* Close button - shows on hover or when active */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className={cn('h-5 w-5 opacity-0 transition-all', (isHovered || isActive) && 'opacity-100')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => onClose(tab.id)}>Close Tab</ContextMenuItem>
        <ContextMenuItem onClick={onCloseAll}>Close All Tabs</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TypeTab;
