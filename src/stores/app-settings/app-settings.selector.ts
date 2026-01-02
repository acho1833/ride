/**
 * App Settings Selectors
 *
 * Selector hooks for accessing app settings state from components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/stores/app.store';
import { AppSettingsSlice } from './app-settings.store';
import { ViewSettingKey, DEFAULT_VIEW_SETTINGS } from '@/models/view-settings.model';

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
