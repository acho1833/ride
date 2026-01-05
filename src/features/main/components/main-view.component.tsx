'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import LeftToolbarComponent from '@/features/toolbars/components/left-toolbar.component';
import RightToolbarComponent from '@/features/toolbars/components/right-toolbar.component';
import { cn } from '@/lib/utils';
import ShowToolbarComponent from '@/features/main/components/show-toolbar.component';
import Workspaces from '@/features/workspaces/components/workspaces.component';
import { useToolbarMode, useUiActions } from '@/stores/ui/ui.selector';
import { useViewSettings } from '@/stores/app-settings/app-settings.selector';
import {
  VIEW_SETTINGS_CONFIG,
  VIEW_SETTING_TO_TOOL_TYPE,
  TOOLBAR_POSITIONS,
  TOOL_TYPE_TO_VIEW_SETTING
} from '@/models/view-settings.model';
import { useEffect } from 'react';

const MainView = () => {
  const toolbarMode = useToolbarMode();
  const viewSettings = useViewSettings()!;
  const { toggleToolbar } = useUiActions();

  // Check if any features are enabled for each position
  // Left panel always visible (FILES has no view setting and is always available)
  const showLeftPanel = true;
  const showRightPanel = VIEW_SETTINGS_CONFIG.some(s => s.position === 'right' && viewSettings[s.key]);
  const showBottomPanel = VIEW_SETTINGS_CONFIG.some(s => s.position === 'bottom' && viewSettings[s.key]);

  // Auto-activate first enabled tool when current becomes disabled
  useEffect(() => {
    TOOLBAR_POSITIONS.forEach(pos => {
      const currentTool = toolbarMode[pos];
      if (!currentTool) return;

      const settingKey = TOOL_TYPE_TO_VIEW_SETTING[currentTool];
      const isDisabled = settingKey && viewSettings[settingKey] === false;

      if (isDisabled) {
        // Find first enabled tool for this position
        const firstEnabled = VIEW_SETTINGS_CONFIG.filter(s => s.position === pos && viewSettings[s.key]).map(
          s => VIEW_SETTING_TO_TOOL_TYPE[s.key]
        )[0];

        toggleToolbar(pos, firstEnabled ?? null);
      }
    });
  }, [viewSettings, toolbarMode, toggleToolbar]);

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
                {showLeftPanel && (
                  <>
                    <ResizablePanel defaultSize={15} className={cn('min-w-[100px]', !toolbarMode.left && 'hidden')} collapsible>
                      <div className="h-full">
                        <ShowToolbarComponent toolType={toolbarMode.left} pos="left" />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle className="bg-transparent" />
                  </>
                )}
                <ResizablePanel defaultSize={70} className="min-w-[100px]">
                  <Workspaces />
                </ResizablePanel>
                {showRightPanel && (
                  <>
                    <ResizableHandle className="bg-transparent" />
                    <ResizablePanel defaultSize={15} className={cn('min-w-[100px]', !toolbarMode.right && 'hidden')}>
                      <ShowToolbarComponent toolType={toolbarMode.right} pos="right" />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
            {showBottomPanel && (
              <>
                <ResizableHandle className="bg-transparent" />
                <ResizablePanel defaultSize={30} className={cn('min-h-[100px]', !toolbarMode.bottom && 'hidden')}>
                  <ShowToolbarComponent toolType={toolbarMode.bottom} pos="bottom" />
                </ResizablePanel>
              </>
            )}
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
