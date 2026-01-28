/**
 * Type Tab Component
 *
 * Single sortable tab component with IntelliJ-style design.
 * Shows close button on hover and supports context menu.
 * Active indicator (blue border) only shows when charts panel is focused.
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Tab } from '@/stores/type-tabs/type-tabs.store';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFocusedPanel } from '@/stores/ui/ui.selector';

interface Props {
  tab: Tab;
  isActive: boolean;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onCloseAll: () => void;
}

const TypeTab = ({ tab, isActive, onActivate, onClose, onCloseAll }: Props) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const focusedPanel = useFocusedPanel();
  const isChartsPanelFocused = focusedPanel === 'charts';

  // SSR Guard: dnd-kit generates IDs that differ server vs client
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: !isMounted
  });

  // Restrict to horizontal movement only by zeroing out Y transform
  const horizontalTransform = transform ? { ...transform, y: 0 } : null;

  const style = isMounted
    ? {
        transform: CSS.Transform.toString(horizontalTransform),
        transition,
        opacity: isDragging ? 0.5 : 1
      }
    : undefined;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={isMounted ? setNodeRef : undefined}
          style={style}
          {...(isMounted ? attributes : {})}
          {...(isMounted ? listeners : {})}
          className={cn(
            'group border-border relative flex h-9 cursor-pointer items-center gap-2 border-r px-3 text-sm transition-colors',
            isActive ? 'bg-secondary text-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            isActive && isChartsPanelFocused ? 'border-t-primary border-t-4' : 'border-t-4 border-t-transparent',
            isDragging && 'z-50'
          )}
          onClick={() => onActivate(tab.id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
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
