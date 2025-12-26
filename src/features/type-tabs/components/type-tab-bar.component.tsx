/**
 * Type Tab Bar Component
 *
 * Container for chart tabs with IntelliJ-style design.
 * Displays all open chart tabs in a horizontal bar.
 */

import React from 'react';
import TypeTab from './type-tab.component';
import { useChartTabs, useChartActiveTabId, useTypeTabActions } from '@/stores/type-tabs/type-tabs.selectors';

const TypeTabBar = () => {
  const tabs = useChartTabs();
  const activeTabId = useChartActiveTabId();
  const { activateChartTab, closeChartTab, closeAllChartTabs } = useTypeTabActions();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="border-border flex items-center overflow-x-auto border-b">
      {tabs.map(tab => (
        <TypeTab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onActivate={activateChartTab}
          onClose={closeChartTab}
          onCloseAll={closeAllChartTabs}
        />
      ))}
    </div>
  );
};

export default TypeTabBar;
