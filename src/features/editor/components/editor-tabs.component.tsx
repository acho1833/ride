/**
 * Editor Tabs Component
 *
 * Tab bar with overflow handling and dropdown menu.
 */

import React from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { EditorGroup, OpenFile } from '@/stores/open-files/open-files.store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EditorTabComponent from '@/features/editor/components/editor-tab.component';

interface Props {
  files: OpenFile[];
  activeFileId: string | null;
  group: EditorGroup;
  onActivate: (fileId: string) => void;
  onClose: (fileId: string) => void;
  onMoveToOtherGroup: (fileId: string) => void;
  onCloseAll: () => void;
}

const EditorTabs = ({ files, activeFileId, group, onActivate, onClose, onMoveToOtherGroup, onCloseAll }: Props) => {
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);

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

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 flex h-9 items-center border-b">
      {/* Tabs container with horizontal scroll */}
      <div ref={tabsContainerRef} className="scrollbar-none flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {files.map(file => (
          <EditorTabComponent
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            group={group}
            onActivate={onActivate}
            onClose={onClose}
            onMoveToOtherGroup={() => onMoveToOtherGroup(file.id)}
            onCloseAll={onCloseAll}
          />
        ))}
      </div>

      {/* Overflow dropdown - shows all files */}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border-border hover:bg-muted flex h-9 w-9 items-center justify-center border-l">
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {files.map(file => (
              <DropdownMenuItem key={file.id} onClick={() => onActivate(file.id)}>
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
          <button className="hover:bg-muted flex h-9 w-9 items-center justify-center">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCloseAll}>Close All Tabs</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EditorTabs;
