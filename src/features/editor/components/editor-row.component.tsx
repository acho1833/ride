/**
 * Editor Row Component
 *
 * Renders a horizontal row of editor groups with resizable panels.
 *
 * @remarks
 * Layout hierarchy: EditorLayout (vertical) → EditorRow (horizontal) → EditorGroup
 *
 * This component handles horizontal splits within a single row.
 * When user selects "Split Right" or "Move Right", groups are added to this row.
 * There's no limit on horizontal groups (EDITOR_CONFIG.xGroupLimit = -1).
 *
 * @example
 * // Row with 3 groups side-by-side
 * ┌──────────┬──────────┬──────────┐
 * │ Group 1  │ Group 2  │ Group 3  │
 * └──────────┴──────────┴──────────┘
 */

'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { EditorRow } from '@/stores/open-files/open-files.store';
import EditorGroupComponent from '@/features/editor/components/editor-group.component';

interface Props {
  row: EditorRow;
}

const EditorRowComponent = ({ row }: Props) => {
  const { groups } = row;

  // Optimization: Skip ResizablePanelGroup overhead when only one group exists.
  // This is common case after closing tabs reduces to single group.
  if (groups.length === 1) {
    return (
      <div className="h-full w-full">
        <EditorGroupComponent groupId={groups[0].id} />
      </div>
    );
  }

  // Distribute space equally among groups. User can resize via drag handles.
  const defaultSize = 100 / groups.length;

  // flatMap pattern: Insert ResizableHandle between each panel.
  // First panel has no preceding handle; subsequent panels get [handle, panel].
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      {groups.flatMap((group, index) => {
        const panel = (
          <ResizablePanel key={group.id} defaultSize={defaultSize} minSize={15}>
            <EditorGroupComponent groupId={group.id} />
          </ResizablePanel>
        );
        if (index === 0) return [panel];
        return [<ResizableHandle key={`handle-${group.id}`} />, panel];
      })}
    </ResizablePanelGroup>
  );
};

export default EditorRowComponent;
