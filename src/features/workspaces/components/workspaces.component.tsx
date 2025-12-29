/**
 * Workspaces Component
 *
 * Main content area containing the editor with drag-and-drop support.
 *
 * @remarks
 * Component hierarchy:
 * 1. MainPanelsComponent - Provides the panel container/styling
 * 2. EditorDndContextComponent - Provides dnd-kit context for tab dragging
 * 3. EditorLayoutComponent - Renders the multi-row, multi-group editor layout
 *
 * The DnD context wraps the entire editor so that tabs can be dragged
 * between any groups, not just within a single group.
 */

import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import EditorDndContextComponent from '@/features/editor/components/editor-dnd-context.component';
import EditorLayoutComponent from '@/features/editor/components/editor-layout.component';

const Workspaces = () => {
  return (
    <MainPanelsComponent>
      <EditorDndContextComponent>
        <EditorLayoutComponent />
      </EditorDndContextComponent>
    </MainPanelsComponent>
  );
};

export default Workspaces;
