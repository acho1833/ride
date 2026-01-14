'use client';

import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppConfigQuery } from '@/features/app-config/hooks/useAppConfigQuery';
import { useAppConfigIsLoaded, useAppConfigActions } from '@/stores/app-config/app-config.selector';
import { useAppSettingsQuery } from '@/features/app-settings/hooks/useAppSettingsQuery';
import { useAppSettingsIsLoaded, useAppSettingsActions } from '@/stores/app-settings/app-settings.selector';
import { useFileTreeQuery } from '@/features/files/hooks/useFileTreeQuery';
import { useFileActions } from '@/stores/files/files.selector';

interface AppConfigProviderProps {
  children: ReactNode;
}

const AppConfigProviderComponent = ({ children }: AppConfigProviderProps) => {
  const isAppConfigLoaded = useAppConfigIsLoaded();
  const isAppSettingsLoaded = useAppSettingsIsLoaded();
  const { setAppConfig } = useAppConfigActions();
  const { setAppSettings } = useAppSettingsActions();
  const { setFileStructure, setFilesLoaded } = useFileActions();

  const { data: appConfigData, isSuccess: isAppConfigSuccess } = useAppConfigQuery();
  const { data: appSettingsData, isSuccess: isAppSettingsSuccess } = useAppSettingsQuery();
  // File tree query is only enabled when a project is selected
  const { data: fileTreeData, isSuccess: isFileTreeSuccess, isFetching, isLoading, status } = useFileTreeQuery();

  console.log('[AppConfigProvider] fileTreeQuery:', { isFileTreeSuccess, isFetching, isLoading, status, hasData: !!fileTreeData });

  useEffect(() => {
    if (isAppConfigSuccess && appConfigData) {
      setAppConfig({ user: appConfigData.user });
    }
    if (isAppSettingsSuccess && appSettingsData) {
      setAppSettings(appSettingsData);
    }
  }, [isAppConfigSuccess, appConfigData, isAppSettingsSuccess, appSettingsData, setAppConfig, setAppSettings]);

  // Load file tree when project is selected and data is available
  useEffect(() => {
    console.log('[AppConfigProvider] fileTree effect:', { isFileTreeSuccess, hasData: !!fileTreeData });
    if (isFileTreeSuccess && fileTreeData) {
      console.log('[AppConfigProvider] Setting file structure and marking loaded');
      setFileStructure(fileTreeData);
      setFilesLoaded();
    }
  }, [isFileTreeSuccess, fileTreeData, setFileStructure, setFilesLoaded]);

  // Only wait for app config and settings to load
  // File tree loading depends on project selection (handled in main-view)
  if (!isAppConfigLoaded || !isAppSettingsLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppConfigProviderComponent;
