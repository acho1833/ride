/**
 * UI Selectors
 *
 * Selector functions and hooks for UI state.
 */

import { useShallow } from 'zustand/react/shallow';
import { UiSlice } from './ui.store';
import { useAppStore } from '@/stores/app.store';

// ============================================================================
// Hooks
// ============================================================================

/** Hook for toggle mode state */
export const useToggleMode = (): boolean => useAppStore((state: UiSlice): boolean => state.ui.toggleMode);

/** Hook for toolbar state */
export const useToolbarMode = () => useAppStore((state: UiSlice) => state.ui.toolbar);

/** Hook for select opened files state */
export const useSelectOpenedFiles = (): boolean => useAppStore((state: UiSlice): boolean => state.ui.selectOpenedFiles);

/** Hook for entire ui object */
export const useUi = () => useAppStore((state: UiSlice) => state.ui);

/** Hook for UI actions (uses shallow compare for performance) */
export const useUiActions = () =>
  useAppStore(
    useShallow((state: UiSlice) => ({
      setToggleMode: state.setToggleMode,
      toggleToolbar: state.toggleToolbar,
      toggleSelectOpenedFiles: state.toggleSelectOpenedFiles
    }))
  );
