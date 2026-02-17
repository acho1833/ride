'use client';

/**
 * Workspace Context Menu Component
 *
 * Unified context menu for workspace graph.
 * Shows different options based on selection state.
 */

import { useRef, useEffect } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { Copy, ClipboardPaste, Trash2, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { CONTEXT_MENU_REOPEN_DELAY_MS } from '@/features/workspace/const';

interface Props {
  /** Position to show menu at, null when closed */
  position: { x: number; y: number } | null;
  /** Called when menu closes */
  onClose: () => void;
  /** Number of selected entities */
  selectedEntityCount: number;
  /** Called when delete is clicked */
  onDelete: () => void;
  /** Called when Spreadline is clicked */
  onSpreadline: () => void;
}

const WorkspaceContextMenuComponent = ({ position, onClose, selectedEntityCount, onDelete, onSpreadline }: Props) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  // Open context menu when position changes
  useEffect(() => {
    if (position && triggerRef.current) {
      const openMenu = () => {
        triggerRef.current?.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            clientX: position.x,
            clientY: position.y
          })
        );
      };

      // If menu is already open, close it first then reopen
      if (openRef.current) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        setTimeout(openMenu, CONTEXT_MENU_REOPEN_DELAY_MS);
      } else {
        openMenu();
      }
    }
  }, [position]);

  const handleOpenChange = (open: boolean) => {
    openRef.current = open;
    if (!open) {
      onClose();
    }
  };

  const handleCopy = () => {
    toast.info('Copy: Not implemented');
  };

  const handlePaste = () => {
    toast.info('Paste: Not implemented');
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>
        <div ref={triggerRef} className="pointer-events-none fixed h-1 w-1" style={{ left: position?.x ?? 0, top: position?.y ?? 0 }} />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleCopy} disabled>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste} disabled>
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Paste
        </ContextMenuItem>
        <ContextMenuSeparator />
        {selectedEntityCount > 0 && (
          <>
            <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            <ContextMenuItem onClick={onSpreadline}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Spreadline
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default WorkspaceContextMenuComponent;
