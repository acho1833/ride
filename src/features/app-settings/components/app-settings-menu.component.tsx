'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ViewSettingsMenuComponent from './view-settings-menu.component';

const AppSettingsMenuComponent = () => {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>App Settings</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start">
        <ViewSettingsMenuComponent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppSettingsMenuComponent;
