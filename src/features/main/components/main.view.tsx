'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import LeftToolbarComponent from '@/features/toolbars/components/left-toolbar.component';
import RightToolbarComponent from '@/features/toolbars/components/right-toolbar.component';
import { cn } from '@/lib/utils';
import ShowToolbarComponent from '@/features/main/components/show-toolbar.component';
import Workspaces from '@/features/workspaces/components/workspaces.component';
import { useToolbarMode } from '@/stores/ui/ui.selector';

const MainView = () => {
  const toolbarMode = useToolbarMode();

  return (
    <div className="flex flex-1 space-x-1">
      <div className="mx-auto w-[45px]">
        <LeftToolbarComponent activeToolTypes={[toolbarMode.left, toolbarMode.bottom]} />
      </div>
      <div className="flex-1">
        <div className="h-full pb-1">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} className="min-h-[200px]">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={15} className={cn('min-w-[100px]', !toolbarMode.left && 'hidden')} collapsible>
                  <div className="h-full">
                    <ShowToolbarComponent toolType={toolbarMode.left} pos="left" />
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={70} className="min-w-[100px]">
                  <Workspaces />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={15} className={cn('min-w-[100px]', !toolbarMode.right && 'hidden')}>
                  <ShowToolbarComponent toolType={toolbarMode.right} pos="right" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} className={cn('min-h-[100px]', !toolbarMode.bottom && 'hidden')}>
              <ShowToolbarComponent toolType={toolbarMode.bottom} pos="bottom" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      <div className="mx-auto w-[45px]">
        <RightToolbarComponent activeToolType={toolbarMode.right} />
      </div>
    </div>
  );
};

export default MainView;
