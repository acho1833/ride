'use client';

import { ToolType, ToolTypeOption } from '@/features/toolbars/types';
import { BotIcon, ChartCandlestickIcon, FolderIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiActions } from '@/stores/ui/ui.selector';

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

  const toggleLeftToolbar = (toolType: ToolType) => {
    toggleToolbar('left', toolType);
  };

  const toggleBottomToolbar = (toolType: ToolType) => {
    toggleToolbar('bottom', toolType);
  };

  return (
    <div className="flex h-full flex-col items-center justify-between">
      <div className="flex flex-col items-center gap-y-2">
        {topTools.map(tool => {
          return (
            <div key={tool.type}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLeftToolbar(tool.type)}
                className={cn(activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50')}
              >
                <tool.icon className="size-5" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="mb-1 flex flex-col items-center gap-y-2">
        {bottomTools.map(tool => {
          return (
            <div key={tool.type}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleBottomToolbar(tool.type)}
                className={cn(activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50')}
              >
                <tool.icon className="size-5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeftToolbarComponent;
