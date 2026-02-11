'use client';

import { LayoutDashboard, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  hiddenCount: number;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  onOpenDashboard: () => void;
}

const WorkspaceToolbarComponent = ({ hiddenCount, isFilterPanelOpen, onToggleFilterPanel, onOpenDashboard }: Props) => {
  return (
    <div className="bg-background flex h-8 shrink-0 items-center justify-between border-b px-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={onOpenDashboard} title="Open Dashboard">
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant={isFilterPanelOpen ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={onToggleFilterPanel}
          title="Toggle Filters"
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span>Filter</span>
          {hiddenCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
              {hiddenCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceToolbarComponent;
