'use client';

/**
 * Type Tab Container Component
 *
 * Main container that combines the tab bar and tab content.
 * Manages the display of chart tabs and their content.
 */

import React from 'react';
import TypeTabBar from './type-tab-bar.component';
import TypeTabContent from './type-tab-content.component';
import { useChartActiveTab } from '@/stores/type-tabs/type-tabs.selector';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Props {
  pos: ToolbarPositions;
}

const TypeTabContainer = ({ pos }: Props) => {
  const activeTab = useChartActiveTab();

  return (
    <MainPanelsComponent title="Charts" pos={pos} focusPanelType="charts">
      <div className="flex h-full flex-col">
        {/* Tab bar */}
        <TypeTabBar />

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab ? (
            activeTab.type === 'SPREADLINE' ? (
              <div className="h-full">
                <TypeTabContent tab={activeTab} />
              </div>
            ) : (
              <ScrollArea className="h-full" type="hover">
                <TypeTabContent tab={activeTab} />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )
          ) : (
            <div className="bg-background flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-muted-foreground text-lg font-medium">No Chart Open</h2>
                <p className="text-muted-foreground mt-2 text-sm">Open a chart tab to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainPanelsComponent>
  );
};

export default TypeTabContainer;
