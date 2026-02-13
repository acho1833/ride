/**
 * UI Selectors
 *
 * Selector hooks for accessing UI state from components.
 *
 * @remarks
 * Following Zustand best practices:
 * - Granular state selectors for minimal re-render scope
 * - Action selector batched with useShallow for stable reference
 *
 * @see ui.store.ts - The underlying store slice
 */

import { useShallow } from 'zustand/react/shallow';
import { DEFAULT_PANEL_SIZES, FocusedPanelType, PanelGroup, UiSlice } from './ui.store';
import { useAppStore } from '@/stores/app.store';

// ============================================================================
// State Selectors
// ============================================================================

/** Get the toggle mode state */
export const useToggleMode = (): boolean => useAppStore((state: UiSlice): boolean => state.ui.toggleMode);

/** Get which tool is active in each toolbar position */
export const useToolbarMode = () => useAppStore((state: UiSlice) => state.ui.toolbar);

/**
 * Get whether "Select Opened Files" sync is enabled.
 * When true, clicking tabs reveals/selects the file in the explorer.
 */
export const useSelectOpenedFiles = (): boolean => useAppStore((state: UiSlice): boolean => state.ui.selectOpenedFiles);

/** Get entire UI state object (use sparingly, prefer granular selectors) */
export const useUi = () => useAppStore((state: UiSlice) => state.ui);

/** Get the currently focused panel */
export const useFocusedPanel = (): FocusedPanelType => useAppStore((state: UiSlice): FocusedPanelType => state.ui.focusedPanel);

/** Check if a specific editor group is focused */
export const useIsEditorGroupFocused = (groupId: string): boolean =>
  useAppStore((state: UiSlice): boolean => state.ui.focusedPanel === `editor-group-${groupId}`);

/** Get persisted panel sizes for a layout group (falls back to defaults for stale sessionStorage) */
export const usePanelSizes = (group: PanelGroup): number[] =>
  useAppStore((state: UiSlice) => state.ui.panelSizes?.[group] ?? DEFAULT_PANEL_SIZES[group]);

// ============================================================================
// Action Selector
// ============================================================================

/**
 * Get all UI actions.
 * Uses useShallow to return a stable object reference.
 */
export const useUiActions = () =>
  useAppStore(
    useShallow((state: UiSlice) => ({
      setToggleMode: state.setToggleMode,
      toggleToolbar: state.toggleToolbar,
      toggleSelectOpenedFiles: state.toggleSelectOpenedFiles,
      setFocusedPanel: state.setFocusedPanel,
      setPanelSizes: state.setPanelSizes
    }))
  );
