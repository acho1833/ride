/**
 * Editor Layout Component
 *
 * Top-level layout for the editor area. Renders rows vertically with resizable panels.
 *
 * @remarks
 * Layout hierarchy: EditorLayout (vertical) → EditorRow (horizontal) → EditorGroup
 *
 * This is the root of the split view system. Vertical splits create new rows here.
 * Maximum rows controlled by EDITOR_CONFIG.yGroupLimit (currently 2 = top/bottom only).
 *
 * @example
 * // Two rows stacked vertically, each with its own groups
 * ┌─────────────────────────────┐
 * │          Row 1              │
 * │  ┌─────────┬─────────┐      │
 * │  │ Group A │ Group B │      │
 * │  └─────────┴─────────┘      │
 * ├─────────────────────────────┤ ← Drag handle
 * │          Row 2              │
 * │  ┌─────────────────┐        │
 * │  │     Group C     │        │
 * │  └─────────────────┘        │
 * └─────────────────────────────┘
 */

'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useEditorRows } from '@/stores/open-files/open-files.selector';
import EditorRowComponent from '@/features/editor/components/editor-row.component';

const EditorLayoutComponent = () => {
  const rows = useEditorRows();

  // Edge case: All files closed. cleanupEmptyGroupsAndRows should prevent this,
  // but we handle it gracefully just in case.
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
        <p>No editor groups</p>
      </div>
    );
  }

  // Optimization: Skip ResizablePanelGroup when only one row exists.
  // This is the common case - most users don't use vertical splits.
  if (rows.length === 1) {
    return (
      <div className="h-full w-full">
        <EditorRowComponent row={rows[0]} />
      </div>
    );
  }

  // Multiple rows: Create vertical panels with drag handles between them
  const defaultSize = 100 / rows.length;

  return (
    <ResizablePanelGroup direction="vertical" className="h-full w-full">
      {rows.flatMap((row, index) => {
        const panel = (
          <ResizablePanel key={row.id} defaultSize={defaultSize} minSize={15}>
            <EditorRowComponent row={row} />
          </ResizablePanel>
        );
        // First row has no preceding handle; subsequent rows get [handle, panel]
        if (index === 0) return [panel];
        return [<ResizableHandle key={`handle-${row.id}`} />, panel];
      })}
    </ResizablePanelGroup>
  );
};

export default EditorLayoutComponent;
