/**
 * Editor Group Component
 *
 * Single editor group containing a tab bar and content area.
 *
 * @remarks
 * A "group" is the atomic unit of the split view system - one tab bar + one content pane.
 * Multiple groups can exist in a row (horizontal split) or across rows (vertical split).
 *
 * Focus tracking: When user clicks/focuses this group, we update lastFocusedGroupId.
 * This determines where new files open when no specific group is targeted.
 *
 * @example
 * ┌─────────────────────────────┐
 * │ [Tab1] [Tab2] [Tab3]  [▼]   │  ← EditorTabsComponent
 * ├─────────────────────────────┤
 * │                             │
 * │     File Content Area       │  ← EditorContentComponent
 * │                             │
 * └─────────────────────────────┘
 */

'use client';

import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import EditorTabsComponent from '@/features/editor/components/editor-tabs.component';
import EditorContentComponent from '@/features/editor/components/editor-content.component';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  groupId: GroupId;
}

const EditorGroupComponent = ({ groupId }: Props) => {
  const group = useEditorGroup(groupId);
  const { setLastFocusedGroup } = useOpenFilesActions();

  // Group may not exist briefly during cleanup transitions
  if (!group) {
    return null;
  }

  const { files, activeFileId } = group;
  const activeFile = files.find(f => f.id === activeFileId);

  // Track which group user last interacted with.
  // Used by openFile() to determine default target when no group specified.
  const handleFocus = () => {
    setLastFocusedGroup(groupId);
  };

  return (
    // Both onFocus and onMouseDown ensure we catch focus from keyboard and mouse
    <div className="flex h-full flex-col" onFocus={handleFocus} onMouseDown={handleFocus}>
      <EditorTabsComponent groupId={groupId} />

      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full" type="hover">
          {activeFile ? (
            <EditorContentComponent fileId={activeFile.id} fileName={activeFile.name} />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <p>No file selected</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default EditorGroupComponent;
