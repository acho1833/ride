'use client';

import { useUser } from '@/stores/app-config/app-config.selector';
import { ApertureIcon } from 'lucide-react';

const AppHeaderComponent = () => {
  const user = useUser();

  return (
    <div className="flex items-center justify-between gap-x-2 p-1">
      <div className="text-primary flex items-center gap-x-1">
        <ApertureIcon className="size-4" />
        <div className="text-[15px] font-bold">KX</div>
      </div>
      <span className="text-muted-foreground text-sm">{user?.sid}</span>
    </div>
  );
};

export default AppHeaderComponent;
