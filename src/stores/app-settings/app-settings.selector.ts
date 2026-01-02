/**
 * App Settings Selectors
 *
 * Selector hooks for accessing app settings state from components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/stores/app.store';
import { AppSettingsSlice } from './app-settings.store';
import { ToolType } from '@/features/toolbars/types';
import {
  ViewSettingKey,
  DEFAULT_VIEW_SETTINGS,
  ToolbarPosition,
  VIEW_SETTINGS_CONFIG,
  TOOL_TYPE_TO_VIEW_SETTING
} from '@/models/view-settings.model';

// ============================================================================
// State Selectors
// ============================================================================

/** Check if app settings have been loaded */
export const useAppSettingsIsLoaded = (): boolean => useAppStore((state: AppSettingsSlice): boolean => state.appSettings.isLoaded);

/** Get the full app settings object */
export const useAppSettingsData = () => useAppStore((state: AppSettingsSlice) => state.appSettings.data);

/** Get the view settings record */
export const useViewSettings = () => useAppStore((state: AppSettingsSlice) => state.appSettings.data?.view);

/** Get a specific view setting value with default fallback */
export const useViewSetting = (key: ViewSettingKey): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => state.appSettings.data?.view[key] ?? DEFAULT_VIEW_SETTINGS[key]);

/** Check if a specific tool type is enabled (tools without settings return true) */
export const useIsToolEnabled = (toolType: ToolType): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => {
    const settingKey = TOOL_TYPE_TO_VIEW_SETTING[toolType];
    if (!settingKey) return true; // No setting = always enabled (e.g., FILES)
    return state.appSettings.data?.view[settingKey] ?? DEFAULT_VIEW_SETTINGS[settingKey];
  });

/** Check if any tool in a position is enabled (for panel visibility) */
export const useIsPositionVisible = (position: ToolbarPosition): boolean =>
  useAppStore((state: AppSettingsSlice): boolean => {
    const positionSettings = VIEW_SETTINGS_CONFIG.filter(s => s.position === position);
    return positionSettings.some(s => state.appSettings.data?.view[s.key] ?? DEFAULT_VIEW_SETTINGS[s.key]);
  });

// ============================================================================
// Action Selector
// ============================================================================

/** Get all app settings actions */
export const useAppSettingsActions = () =>
  useAppStore(
    useShallow((state: AppSettingsSlice) => ({
      setAppSettings: state.setAppSettings
    }))
  );
