'use client';

import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ThemeSwitchComponent from './theme-switch.component';

const SettingsMenuComponent = () => {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="size-5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="end">
        <ThemeSwitchComponent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsMenuComponent;
