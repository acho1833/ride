/**
 * Type Tabs State Store
 *
 * Zustand slice for managing type-based tabs (charts category).
 */

import { StateCreator } from 'zustand';

// ============================================================================
// Types
// ============================================================================

/** Chart type union - types of charts that can be displayed in tabs */
export type ChartType = 'SPREADLINE' | 'BAR' | 'LINE' | 'PIE';

/** Base tab interface */
export interface Tab<T = unknown> {
  id: string;
  name: string;
  type: ChartType;
  data: T;
}

/** Spreadline-specific data */
export interface SpreadlineData {
  // Add spreadline-specific fields here
  // Example placeholder:
  values?: number[];
  labels?: string[];
}

/** Chart tab category - contains tabs and active tab ID */
export interface ChartTabCategory {
  tabs: Tab[];
  activeTabId: string | null;
}

/** Type tabs state interface */
export interface TypeTabState {
  typeTabs: {
    charts: ChartTabCategory;
  };
}

/** Type tabs action methods */
export interface TypeTabActions {
  openChartTab: (tab: Tab) => void;
  closeChartTab: (tabId: string) => void;
  activateChartTab: (tabId: string) => void;
  closeAllChartTabs: () => void;
}

/** Combined type tabs store type */
export type TypeTabSlice = TypeTabState & TypeTabActions;

// ============================================================================
// Slice Creator
// ============================================================================

/**
 * Creates the type tabs slice for the store
 */
export const createTypeTabSlice: StateCreator<TypeTabSlice, [], [], TypeTabSlice> = set => ({
  typeTabs: {
    charts: {
      tabs: [
        {
          id: 'chart-123', // Using a fixed ID
          name: 'SPREADLINE-sample1',
          type: 'SPREADLINE',
          data: {
            values: [100, 200],
            labels: ['X', 'Y']
          }
        }
        // {
        //   id: 'chart-222', // Using a fixed ID
        //   name: 'SPREADLINE-sample2',
        //   type: 'SPREADLINE',
        //   data: {
        //     values: [100, 200],
        //     labels: ['X', 'Y']
        //   }
        // }
      ],
      activeTabId: 'chart-123'
    }
  },

  // Chart tab actions
  openChartTab: (tab: Tab) =>
    set(state => {
      // Check if tab already exists
      const existingTab = state.typeTabs.charts.tabs.find(t => t.id === tab.id);

      if (existingTab) {
        // Tab exists, just activate it
        return {
          typeTabs: {
            ...state.typeTabs,
            charts: {
              ...state.typeTabs.charts,
              activeTabId: tab.id
            }
          }
        };
      }

      // Add new tab and activate it
      return {
        typeTabs: {
          ...state.typeTabs,
          charts: {
            tabs: [...state.typeTabs.charts.tabs, tab],
            activeTabId: tab.id
          }
        }
      };
    }),

  closeChartTab: (tabId: string) =>
    set(state => {
      const tabs = state.typeTabs.charts.tabs.filter(t => t.id !== tabId);
      const wasActive = state.typeTabs.charts.activeTabId === tabId;

      // If closing the active tab, activate another tab
      let newActiveTabId = state.typeTabs.charts.activeTabId;
      if (wasActive && tabs.length > 0) {
        // Activate the first remaining tab
        newActiveTabId = tabs[0].id;
      } else if (tabs.length === 0) {
        newActiveTabId = null;
      }

      return {
        typeTabs: {
          ...state.typeTabs,
          charts: {
            tabs,
            activeTabId: newActiveTabId
          }
        }
      };
    }),

  activateChartTab: (tabId: string) =>
    set(state => ({
      typeTabs: {
        ...state.typeTabs,
        charts: {
          ...state.typeTabs.charts,
          activeTabId: tabId
        }
      }
    })),

  closeAllChartTabs: () =>
    set(state => ({
      typeTabs: {
        ...state.typeTabs,
        charts: {
          tabs: [],
          activeTabId: null
        }
      }
    }))
});
