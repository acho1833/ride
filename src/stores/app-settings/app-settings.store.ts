/**
 * App Settings Store
 *
 * Zustand slice for managing app-level settings (view settings, future settings).
 * These settings are persisted to the database per user (sid).
 */

import { StateCreator } from 'zustand';
import { AppSettings } from '@/models/app-settings.model';

/** App settings state interface */
export interface AppSettingsState {
  appSettings: {
    isLoaded: boolean;
    data: AppSettings | null;
  };
}

/** App settings action methods */
export interface AppSettingsActions {
  setAppSettings: (data: AppSettings) => void;
}

/** Combined app settings slice type */
export type AppSettingsSlice = AppSettingsState & AppSettingsActions;

/**
 * Creates the app settings slice for the store
 */
export const createAppSettingsSlice: StateCreator<AppSettingsSlice, [], [], AppSettingsSlice> = set => ({
  appSettings: {
    isLoaded: false,
    data: null
  },

  setAppSettings: (data: AppSettings) =>
    set(() => ({
      appSettings: { isLoaded: true, data }
    }))
});
