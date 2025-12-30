'use client';

import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppConfigQuery } from '@/features/app-config/hooks/useAppConfigQuery';
import { useAppConfigIsLoaded, useAppConfigActions } from '@/stores/app-config/app-config.selector';

interface AppConfigProviderProps {
  children: ReactNode;
}

const AppConfigProviderComponent = ({ children }: AppConfigProviderProps) => {
  const isLoaded = useAppConfigIsLoaded();
  const { setAppConfig } = useAppConfigActions();
  const { data, isSuccess } = useAppConfigQuery();

  useEffect(() => {
    if (isSuccess && data) {
      setAppConfig({ user: data.user });
    }
  }, [isSuccess, data, setAppConfig]);

  if (!isLoaded) {
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
