/**
 * UI State Store
 *
 * Zustand slice for managing UI state like toggle modes and toolbar.
 */

import { StateCreator } from 'zustand';
import { ToolType } from '@/features/toolbars/types';

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
    selectOpenedFiles: boolean;
  };
}

/** UI action methods */
export interface UiActions {
  setToggleMode: (mode: boolean) => void;
  toggleToolbar: (position: ToolbarPositions, toolType: ToolType | null) => void;
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

  // UI Actions
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
