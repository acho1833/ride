'use client';

import { ReactNode } from 'react';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import { FocusedPanelType } from '@/features/toolbars/types';
import { Button } from '@/components/ui/button';
import { MinusIcon } from 'lucide-react';
import { useUiActions } from '@/stores/ui/ui.selector';

interface Props {
  title?: string;
  children: ReactNode;
  pos?: ToolbarPositions;
  tools?: ReactNode;
  focusPanelType?: FocusedPanelType;
}

const MainPanelsComponent = ({ children, title, pos, tools, focusPanelType }: Props) => {
  const { toggleToolbar, setFocusedPanel } = useUiActions();
  const onMinimize = () => {
    if (!pos) return;
    toggleToolbar(pos, null);
  };

  const handleClick = () => {
    if (focusPanelType) {
      setFocusedPanel(focusPanelType);
    }
  };

  return (
    <div className="bg-background group flex h-full w-full flex-col overflow-hidden rounded-xl p-1" onClick={handleClick}>
      {title && pos && (
        <div className="flex flex-col gap-y-1">
          <div className="flex justify-between gap-y-1">
            <div className="p-1 text-sm">{title}</div>
            <div className="flex gap-x-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {tools}
              <Button variant="ghost" size="xs" onClick={onMinimize} title="Hide">
                <MinusIcon />
              </Button>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
export default MainPanelsComponent;
