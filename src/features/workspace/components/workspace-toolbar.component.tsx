'use client';

import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  hiddenCount: number;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
}

const WorkspaceToolbarComponent = ({ hiddenCount, isFilterPanelOpen, onToggleFilterPanel }: Props) => {
  return (
    <div className="bg-background flex h-8 shrink-0 items-center justify-end border-b px-2">
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
  );
};

export default WorkspaceToolbarComponent;
