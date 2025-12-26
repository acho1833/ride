/**
 * Editor Layout Component
 *
 * Main layout with resizable split view for left and right editor groups.
 */

'use client';

import React from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  useLeftActiveFileId,
  useLeftGroupFiles,
  useOpenFilesActions,
  useRightActiveFileId,
  useRightGroupFiles
} from '@/stores/open-files/open-files.selector';
import EditorGroupComponent from '@/features/editor/components/editor-group.component';

const EditorLayoutComponent = () => {
  const leftFiles = useLeftGroupFiles();
  const rightFiles = useRightGroupFiles();
  const leftActiveFileId = useLeftActiveFileId();
  const rightActiveFileId = useRightActiveFileId();
  // const lastFocusedGroup = useLastFocusedGroup();

  const { setActiveFile, closeFile, moveFileToGroup, closeAllFiles, setLastFocusedGroup } = useOpenFilesActions();

  const hasRightFiles = rightFiles.length > 0;

  // Handlers for left group
  const handleLeftActivate = (fileId: string) => {
    setActiveFile(fileId, 'left');
  };

  const handleLeftClose = (fileId: string) => {
    closeFile(fileId, 'left');
  };

  const handleLeftMoveToRight = (fileId: string) => {
    const file = leftFiles.find(f => f.id === fileId);
    if (file) {
      moveFileToGroup(fileId, 'left', 'right');
    }
  };

  const handleLeftCloseAll = () => {
    closeAllFiles('left');
  };

  // Handlers for right group
  const handleRightActivate = (fileId: string) => {
    setActiveFile(fileId, 'right');
  };

  const handleRightClose = (fileId: string) => {
    closeFile(fileId, 'right');
  };

  const handleRightMoveToLeft = (fileId: string) => {
    const file = rightFiles.find(f => f.id === fileId);
    if (file) {
      moveFileToGroup(fileId, 'right', 'left');
    }
  };

  const handleRightCloseAll = () => {
    closeAllFiles('right');
  };

  // Single editor group (no split)
  if (!hasRightFiles) {
    return (
      <div className="h-full w-full">
        <EditorGroupComponent
          files={leftFiles}
          activeFileId={leftActiveFileId}
          group="left"
          onActivate={handleLeftActivate}
          onClose={handleLeftClose}
          onMoveToOtherGroup={handleLeftMoveToRight}
          onCloseAll={handleLeftCloseAll}
          onFocus={() => setLastFocusedGroup('left')}
        />
      </div>
    );
  }

  // Split view with both groups
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      {/* Left editor group */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <EditorGroupComponent
          files={leftFiles}
          activeFileId={leftActiveFileId}
          group="left"
          onActivate={handleLeftActivate}
          onClose={handleLeftClose}
          onMoveToOtherGroup={handleLeftMoveToRight}
          onCloseAll={handleLeftCloseAll}
          onFocus={() => setLastFocusedGroup('left')}
        />
      </ResizablePanel>

      {/* Resize handle */}
      <ResizableHandle />

      {/* Right editor group */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <EditorGroupComponent
          files={rightFiles}
          activeFileId={rightActiveFileId}
          group="right"
          onActivate={handleRightActivate}
          onClose={handleRightClose}
          onMoveToOtherGroup={handleRightMoveToLeft}
          onCloseAll={handleRightCloseAll}
          onFocus={() => setLastFocusedGroup('right')}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default EditorLayoutComponent;
