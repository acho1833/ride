'use client';

import { ToolType, ToolTypeOption } from '@/features/toolbars/types';
import { BotIcon, ChartCandlestickIcon, FolderIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useUiActions } from '@/stores/ui/ui.selector';
import { useViewSettings } from '@/stores/app-settings/app-settings.selector';
import { VIEW_SETTINGS_CONFIG, VIEW_SETTING_TO_TOOL_TYPE } from '@/models/view-settings.model';
import SettingsMenuComponent from '@/features/user-settings/components/settings-menu.component';
import AppSettingsMenuComponent from '@/features/app-settings/components/app-settings-menu.component';

const topTools: ToolTypeOption[] = [
  {
    type: 'FILES',
    description: 'Files',
    icon: FolderIcon
  },
  {
    type: 'ENTITY_SEARCH',
    description: 'Entity Search',
    icon: SearchIcon
  }
];

const bottomTools: ToolTypeOption[] = [
  {
    type: 'CHARTS',
    description: 'Charts',
    icon: ChartCandlestickIcon
  },
  {
    type: 'PROMPT',
    description: 'AI Prompt',
    icon: BotIcon
  }
];

interface Props {
  activeToolTypes: (ToolType | null)[];
}

const LeftToolbarComponent = ({ activeToolTypes = [] }: Props) => {
  const { toggleToolbar } = useUiActions();
  const viewSettings = useViewSettings()!;

  // Get enabled tool types for each position from config
  const enabledLeftToolTypes = VIEW_SETTINGS_CONFIG.filter(s => s.position === 'left' && viewSettings[s.key]).map(
    s => VIEW_SETTING_TO_TOOL_TYPE[s.key]
  );
  const enabledBottomToolTypes = VIEW_SETTINGS_CONFIG.filter(s => s.position === 'bottom' && viewSettings[s.key]).map(
    s => VIEW_SETTING_TO_TOOL_TYPE[s.key]
  );

  // Filter tools - FILES always visible, others based on view settings
  const enabledTopTools = topTools.filter(tool => tool.type === 'FILES' || enabledLeftToolTypes.includes(tool.type));
  const enabledBottomTools = bottomTools.filter(tool => enabledBottomToolTypes.includes(tool.type));

  const showBottomSection = enabledBottomTools.length > 0;

  const toggleLeftToolbar = (toolType: ToolType) => {
    toggleToolbar('left', toolType);
  };

  const toggleBottomToolbar = (toolType: ToolType) => {
    toggleToolbar('bottom', toolType);
  };

  return (
    <div className="flex h-full flex-col items-center justify-between">
      <div className="flex flex-col items-center gap-y-2">
        <AppSettingsMenuComponent />
        {enabledTopTools.map(tool => (
          <Tooltip key={tool.type}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLeftToolbar(tool.type)}
                className={cn(activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50')}
              >
                <tool.icon className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{tool.description}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mb-1 flex flex-col items-center gap-y-2">
        {showBottomSection &&
          enabledBottomTools.map(tool => (
            <Tooltip key={tool.type}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleBottomToolbar(tool.type)}
                  className={cn(activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50')}
                >
                  <tool.icon className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{tool.description}</TooltipContent>
            </Tooltip>
          ))}
        <SettingsMenuComponent />
      </div>
    </div>
  );
};

export default LeftToolbarComponent;
