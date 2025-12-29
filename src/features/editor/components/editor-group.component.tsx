/**
 * Editor Group Component
 *
 * Single editor group containing tabs and content area.
 */

'use client';

import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { GroupId } from '@/stores/open-files/open-files.store';
import EditorTabsComponent from '@/features/editor/components/editor-tabs.component';
import EditorContentComponent from '@/features/editor/components/editor-content.component';

interface Props {
  groupId: GroupId;
  rowIndex: number;
  groupIndex: number;
}

const EditorGroupComponent = ({ groupId, rowIndex, groupIndex }: Props) => {
  const group = useEditorGroup(groupId);
  const { setLastFocusedGroup } = useOpenFilesActions();

  if (!group) {
    return null;
  }

  const { files, activeFileId } = group;
  const activeFile = files.find(f => f.id === activeFileId);

  const handleFocus = () => {
    setLastFocusedGroup(groupId);
  };

  return (
    <div className="flex h-full flex-col" onFocus={handleFocus} onMouseDown={handleFocus}>
      {/* Tab bar */}
      <EditorTabsComponent groupId={groupId} rowIndex={rowIndex} groupIndex={groupIndex} />

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {activeFile ? (
          <EditorContentComponent fileId={activeFile.id} fileName={activeFile.name} />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <p>No file selected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorGroupComponent;
