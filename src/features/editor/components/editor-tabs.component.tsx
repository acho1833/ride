/**
 * Editor Tabs Component
 *
 * Tab bar with overflow handling and dropdown menu.
 */

'use client';

import React from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import EditorTabComponent from '@/features/editor/components/editor-tab.component';

interface Props {
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorTabsComponent = ({ groupId, rowIndex, groupIndex }: Props) => {
  const group = useEditorGroup(groupId);
  const { setActiveFile, closeAllFilesInGroup } = useOpenFilesActions();

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);

  const files = group?.files ?? [];
  const activeFileId = group?.activeFileId ?? null;

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

  const handleActivate = (fileId: string) => {
    setActiveFile(fileId, groupId);
  };

  const handleCloseAll = () => {
    closeAllFilesInGroup(groupId);
  };

  return (
    <div className="bg-muted/30 flex h-9 items-center border-b">
      {/* Tabs container with horizontal scroll */}
      <div ref={tabsContainerRef} className="scrollbar-none flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {files.map(file => (
          <EditorTabComponent
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            groupId={groupId}
            rowIndex={rowIndex}
            groupIndex={groupIndex}
          />
        ))}
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
