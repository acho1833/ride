/**
 * Editor Group Component
 *
 * Single editor group containing tabs and content area.
 */

import React from 'react';
import { EditorGroup as EditorGroupType, OpenFile } from '@/stores/open-files/open-files.store';
import EditorTabsComponent from '@/features/editor/components/editor-tabs.component';
import EditorContentComponent from '@/features/editor/components/editor-content.component';

interface Props {
  files: OpenFile[];
  activeFileId: string | null;
  group: EditorGroupType;
  onActivate: (fileId: string) => void;
  onClose: (fileId: string) => void;
  onMoveToOtherGroup: (fileId: string) => void;
  onCloseAll: () => void;
  onFocus: () => void;
}

const EditorGroupComponent = ({ files, activeFileId, group, onActivate, onClose, onMoveToOtherGroup, onCloseAll, onFocus }: Props) => {
  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div className="flex h-full flex-col" onFocus={onFocus} onMouseDown={onFocus}>
      {/* Tab bar */}
      <EditorTabsComponent
        files={files}
        activeFileId={activeFileId}
        group={group}
        onActivate={onActivate}
        onClose={onClose}
        onMoveToOtherGroup={onMoveToOtherGroup}
        onCloseAll={onCloseAll}
      />

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
