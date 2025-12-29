/**
 * Editor Row Component
 *
 * Renders a horizontal row of editor groups with resizable panels.
 */

'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { EditorRow } from '@/stores/open-files/open-files.store';
import EditorGroupComponent from '@/features/editor/components/editor-group.component';

interface Props {
  row: EditorRow;
  rowIndex: number;
}

const EditorRowComponent = ({ row, rowIndex }: Props) => {
  const { groups } = row;

  // Single group - no resizable needed
  if (groups.length === 1) {
    return (
      <div className="h-full w-full">
        <EditorGroupComponent groupId={groups[0].id} rowIndex={rowIndex} groupIndex={0} />
      </div>
    );
  }

  // Multiple groups - use resizable panels
  const defaultSize = 100 / groups.length;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      {groups.flatMap((group, groupIndex) => {
        const panel = (
          <ResizablePanel key={group.id} defaultSize={defaultSize} minSize={15}>
            <EditorGroupComponent groupId={group.id} rowIndex={rowIndex} groupIndex={groupIndex} />
          </ResizablePanel>
        );
        if (groupIndex === 0) return [panel];
        return [<ResizableHandle key={`handle-${group.id}`} />, panel];
      })}
    </ResizablePanelGroup>
  );
};

export default EditorRowComponent;
