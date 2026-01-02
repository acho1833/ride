'use client';

import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppConfigQuery } from '@/features/app-config/hooks/useAppConfigQuery';
import { useAppConfigIsLoaded, useAppConfigActions } from '@/stores/app-config/app-config.selector';
import { useAppSettingsQuery } from '@/features/app-settings/hooks/useAppSettingsQuery';
import { useAppSettingsIsLoaded, useAppSettingsActions } from '@/stores/app-settings/app-settings.selector';
import { useFileTreeQuery } from '@/features/files/hooks/useFileTreeQuery';
import { useFilesIsLoaded, useFileActions } from '@/stores/files/files.selector';

interface AppConfigProviderProps {
  children: ReactNode;
}

const AppConfigProviderComponent = ({ children }: AppConfigProviderProps) => {
  const isAppConfigLoaded = useAppConfigIsLoaded();
  const isAppSettingsLoaded = useAppSettingsIsLoaded();
  const isFilesLoaded = useFilesIsLoaded();
  const { setAppConfig } = useAppConfigActions();
  const { setAppSettings } = useAppSettingsActions();
  const { setFileStructure, setFilesLoaded } = useFileActions();

  const { data: appConfigData, isSuccess: isAppConfigSuccess } = useAppConfigQuery();
  const { data: appSettingsData, isSuccess: isAppSettingsSuccess } = useAppSettingsQuery();
  const { data: fileTreeData, isSuccess: isFileTreeSuccess } = useFileTreeQuery();

  useEffect(() => {
    if (isAppConfigSuccess && appConfigData) {
      setAppConfig({ user: appConfigData.user });
    }
    if (isAppSettingsSuccess && appSettingsData) {
      setAppSettings(appSettingsData);
    }
    if (isFileTreeSuccess && fileTreeData) {
      setFileStructure(fileTreeData);
      setFilesLoaded();
    }
  }, [
    isAppConfigSuccess,
    appConfigData,
    isAppSettingsSuccess,
    appSettingsData,
    isFileTreeSuccess,
    fileTreeData,
    setAppConfig,
    setAppSettings,
    setFileStructure,
    setFilesLoaded
  ]);

  if (!isAppConfigLoaded || !isAppSettingsLoaded || !isFilesLoaded) {
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
