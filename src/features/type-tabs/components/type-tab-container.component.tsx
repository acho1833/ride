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
import { useChartActiveTab } from '@/stores/type-tabs/type-tabs.selectors';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';

interface Props {
  pos: ToolbarPositions;
}

const TypeTabContainer = ({ pos }: Props) => {
  const activeTab = useChartActiveTab();

  return (
    <MainPanelsComponent title="Charts" pos={pos}>
      <div className="flex h-full flex-col">
        {/* Tab bar */}
        <TypeTabBar />

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {activeTab ? (
            <TypeTabContent tab={activeTab} />
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
