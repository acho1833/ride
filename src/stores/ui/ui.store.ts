/**
 * UI State Store
 *
 * Zustand slice for managing global UI state (toggles, toolbar visibility).
 *
 * @remarks
 * State managed:
 * - `toggleMode`: General toggle state (used by other features)
 * - `toolbar`: Which tool is active in each panel position (left/right/bottom)
 * - `selectOpenedFiles`: Whether clicking tabs syncs with file explorer
 *
 * The `selectOpenedFiles` toggle is used by the file explorer feature:
 * - When ON: Clicking a tab reveals and selects the file in the tree
 * - When OFF: Tab clicks don't affect the file tree
 *
 * @see ui.selector.ts - Selector hooks for this state
 */

import { StateCreator } from 'zustand';
import { FocusedPanelType, ToolType } from '@/features/toolbars/types';
import { TOOL_TYPE_TO_FOCUS_PANEL } from '@/models/view-settings.model';

/** Panel positions where toolbars can be docked */
export type ToolbarPositions = 'left' | 'right' | 'bottom';

// Re-export for consumers
export type { FocusedPanelType } from '@/features/toolbars/types';

/** Panel group identifiers for the main layout */
export type PanelGroup = 'vertical' | 'horizontal';

/** Default panel sizes for the main layout */
export const DEFAULT_PANEL_SIZES: Record<PanelGroup, number[]> = {
  vertical: [70, 30],
  horizontal: [15, 70, 15]
};

/** UI component state interface */
export interface UiComponentState {
  ui: {
    toggleMode: boolean;
    toolbar: {
      left: ToolType | null;
      right: ToolType | null;
      bottom: ToolType | null;
    };
    /** Whether tab clicks should reveal files in the explorer tree */
    selectOpenedFiles: boolean;
    /** Currently focused panel for visual highlighting */
    focusedPanel: FocusedPanelType;
    /** Persisted panel sizes for the main layout */
    panelSizes: Record<PanelGroup, number[]>;
  };
}

/** UI action methods */
export interface UiActions {
  setToggleMode: (mode: boolean) => void;
  toggleToolbar: (position: ToolbarPositions, toolType: ToolType | null) => void;
  /** Toggle the "Select Opened Files" sync feature */
  toggleSelectOpenedFiles: () => void;
  /** Set the currently focused panel */
  setFocusedPanel: (panel: FocusedPanelType) => void;
  /** Persist panel sizes for a layout group */
  setPanelSizes: (group: PanelGroup, sizes: number[]) => void;
}

/** Combined UI store type */
export type UiSlice = UiComponentState & UiActions;

/**
 * Creates the UI slice for the store
 */
export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = set => ({
  ui: {
    toggleMode: false,
    toolbar: {
      left: 'FILES' as ToolType,
      right: 'ALERT' as ToolType,
      bottom: 'CHARTS' as ToolType
    },
    selectOpenedFiles: false,
    focusedPanel: null,
    panelSizes: { ...DEFAULT_PANEL_SIZES }
  },

  setToggleMode: (toggleMode: boolean) =>
    set(state => ({
      ui: { ...state.ui, toggleMode }
    })),

  toggleToolbar: (pos: ToolbarPositions, toolType: ToolType | null) =>
    set(state => {
      const isClosing = state.ui.toolbar[pos] === toolType;
      const newToolType = isClosing ? null : toolType;

      // Set focus when opening a panel, clear focus when closing
      let newFocusedPanel = state.ui.focusedPanel;
      if (isClosing && toolType && state.ui.focusedPanel === TOOL_TYPE_TO_FOCUS_PANEL[toolType]) {
        newFocusedPanel = null;
      } else if (!isClosing && toolType) {
        // Opening a panel - set focus to it
        newFocusedPanel = TOOL_TYPE_TO_FOCUS_PANEL[toolType];
      }

      return {
        ui: {
          ...state.ui,
          toolbar: {
            ...state.ui.toolbar,
            [pos]: newToolType
          },
          focusedPanel: newFocusedPanel
        }
      };
    }),

  toggleSelectOpenedFiles: () =>
    set(state => ({
      ui: { ...state.ui, selectOpenedFiles: !state.ui.selectOpenedFiles }
    })),

  setFocusedPanel: (focusedPanel: FocusedPanelType) =>
    set(state => {
      // Skip update if already focused on this panel
      if (state.ui.focusedPanel === focusedPanel) return state;
      return { ui: { ...state.ui, focusedPanel } };
    }),

  setPanelSizes: (group: PanelGroup, sizes: number[]) =>
    set(state => ({
      ui: { ...state.ui, panelSizes: { ...state.ui.panelSizes, [group]: sizes } }
    }))
});
