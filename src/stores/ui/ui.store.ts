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
import { ToolType } from '@/features/toolbars/types';

/** Panel positions where toolbars can be docked */
export type ToolbarPositions = 'left' | 'right' | 'bottom';

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
  };
}

/** UI action methods */
export interface UiActions {
  setToggleMode: (mode: boolean) => void;
  toggleToolbar: (position: ToolbarPositions, toolType: ToolType | null) => void;
  /** Toggle the "Select Opened Files" sync feature */
  toggleSelectOpenedFiles: () => void;
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
    selectOpenedFiles: false
  },

  setToggleMode: (toggleMode: boolean) =>
    set(state => ({
      ui: { ...state.ui, toggleMode }
    })),

  toggleToolbar: (pos: ToolbarPositions, toolType: ToolType | null) =>
    set(state => ({
      ui: {
        ...state.ui,
        toolbar: {
          ...state.ui.toolbar,
          [pos]: state.ui.toolbar[pos] === toolType ? null : toolType
        }
      }
    })),

  toggleSelectOpenedFiles: () =>
    set(state => ({
      ui: { ...state.ui, selectOpenedFiles: !state.ui.selectOpenedFiles }
    }))
});
