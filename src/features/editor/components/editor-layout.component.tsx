/**
 * Editor Layout Component
 *
 * Main layout rendering rows vertically with resizable panels.
 */

'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useEditorRows } from '@/stores/open-files/open-files.selector';
import EditorRowComponent from '@/features/editor/components/editor-row.component';

const EditorLayoutComponent = () => {
  const rows = useEditorRows();

  // No rows - shouldn't happen but handle gracefully
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
        <p>No editor groups</p>
      </div>
    );
  }

  // Single row - no vertical resizing needed
  if (rows.length === 1) {
    return (
      <div className="h-full w-full">
        <EditorRowComponent row={rows[0]} rowIndex={0} />
      </div>
    );
  }

  // Multiple rows - use vertical resizable panels
  const defaultSize = 100 / rows.length;

  return (
    <ResizablePanelGroup direction="vertical" className="h-full w-full">
      {rows.flatMap((row, rowIndex) => {
        const panel = (
          <ResizablePanel key={row.id} defaultSize={defaultSize} minSize={15}>
            <EditorRowComponent row={row} rowIndex={rowIndex} />
          </ResizablePanel>
        );
        if (rowIndex === 0) return [panel];
        return [<ResizableHandle key={`handle-${row.id}`} />, panel];
      })}
    </ResizablePanelGroup>
  );
};

export default EditorLayoutComponent;
