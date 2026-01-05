'use client';

import { ToolType, ToolTypeOption } from '@/features/toolbars/types';
import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useUiActions } from '@/stores/ui/ui.selector';
import { useViewSettings } from '@/stores/app-settings/app-settings.selector';
import { VIEW_SETTINGS_CONFIG, VIEW_SETTING_TO_TOOL_TYPE } from '@/models/view-settings.model';

const tools: ToolTypeOption[] = [
  {
    type: 'ALERT',
    description: 'Notifications',
    icon: BellIcon
  }
];

interface Props {
  activeToolType: ToolType | null;
}

const RightToolbarComponent = ({ activeToolType }: Props) => {
  const { toggleToolbar } = useUiActions();
  const viewSettings = useViewSettings()!;

  // Get enabled tool types for right position from config
  const enabledRightToolTypes = VIEW_SETTINGS_CONFIG.filter(s => s.position === 'right' && viewSettings[s.key]).map(
    s => VIEW_SETTING_TO_TOOL_TYPE[s.key]
  );

  // Hide entire toolbar if no right-position features are enabled
  if (enabledRightToolTypes.length === 0) return null;

  const enabledTools = tools.filter(tool => enabledRightToolTypes.includes(tool.type));

  const toggleRightToolbar = (toolType: ToolType) => {
    toggleToolbar('right', toolType);
  };

  return (
    <div className="flex flex-col items-center gap-y-2">
      {enabledTools.map(tool => (
        <Tooltip key={tool.type}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleRightToolbar(tool.type)}
              className={cn(activeToolType === tool.type && 'bg-input dark:hover:bg-input/50')}
            >
              <tool.icon className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{tool.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default RightToolbarComponent;
