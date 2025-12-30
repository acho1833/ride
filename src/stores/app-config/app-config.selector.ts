import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { AppConfigSlice } from './app-config.store';

export const useAppConfigIsLoaded = () => useAppStore((state: AppConfigSlice) => state.appConfig.isLoaded);

export const useAppConfigActions = () =>
  useAppStore(
    useShallow((state: AppConfigSlice) => ({
      setAppConfig: state.setAppConfig
    }))
  );

export const useUser = () => useAppStore((state: AppConfigSlice) => state.appConfig.user);
