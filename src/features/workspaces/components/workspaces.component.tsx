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
