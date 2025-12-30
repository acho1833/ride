import { StateCreator } from 'zustand';

export interface AppConfigState {
  appConfig: {
    user: {
      sid: string;
    } | null;
    isLoaded: boolean;
  };
}

export interface AppConfigActions {
  setAppConfig: (config: { user: { sid: string } }) => void;
}

export type AppConfigSlice = AppConfigState & AppConfigActions;

export const createAppConfigSlice: StateCreator<AppConfigSlice, [], [], AppConfigSlice> = set => ({
  appConfig: {
    user: null,
    isLoaded: false
  },

  setAppConfig: config =>
    set(state => ({
      appConfig: {
        ...state.appConfig,
        user: config.user,
        isLoaded: true
      }
    }))
});
