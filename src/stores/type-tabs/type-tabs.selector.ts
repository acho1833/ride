/**
 * Type Tabs Selectors
 *
 * Selector functions and hooks for type tabs state.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { TypeTabSlice } from '@/stores/type-tabs/type-tabs.store';

// ============================================================================
// Selector Hooks
// ============================================================================

/** Hook for all chart tabs */
export const useChartTabs = () => useAppStore((state: TypeTabSlice) => state.typeTabs.charts.tabs);

/** Hook for active chart tab ID */
export const useChartActiveTabId = () => useAppStore((state: TypeTabSlice) => state.typeTabs.charts.activeTabId);

/** Hook for active chart tab object */
export const useChartActiveTab = () =>
  useAppStore((state: TypeTabSlice) => {
    const activeTabId = state.typeTabs.charts.activeTabId;
    if (!activeTabId) return null;
    return state.typeTabs.charts.tabs.find(tab => tab.id === activeTabId) || null;
  });

/** Hook for entire charts object */
export const useCharts = () => useAppStore((state: TypeTabSlice) => state.typeTabs.charts);

/** Hook for type tab actions */
export const useTypeTabActions = () =>
  useAppStore(
    useShallow((state: TypeTabSlice) => ({
      openChartTab: state.openChartTab,
      closeChartTab: state.closeChartTab,
      activateChartTab: state.activateChartTab,
      closeAllChartTabs: state.closeAllChartTabs
    }))
  );
