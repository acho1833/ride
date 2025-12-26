'use client';

import { ToolType, ToolTypeOption } from '@/features/toolbars/types';
import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiActions } from '@/stores/ui/ui.selector';

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

  const toggleRightToolbar = (toolType: ToolType) => {
    toggleToolbar('right', toolType);
  };

  return (
    <div className="flex flex-col items-center gap-y-2">
      {tools.map(tool => {
        return (
          <div key={tool.type}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleRightToolbar(tool.type)}
              className={cn(activeToolType === tool.type && 'bg-input dark:hover:bg-input/50')}
            >
              <tool.icon className="size-5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default RightToolbarComponent;
