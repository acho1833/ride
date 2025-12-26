import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ToolbarPositions } from '@/stores/ui/ui.store';

interface Props {
  pos: ToolbarPositions;
}

const EntitySearchComponent = ({ pos }: Props) => {
  return (
    <MainPanelsComponent title="Entity Search" pos={pos}>
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-1">
          <Button variant="ghost" size="xs">
            <ChevronRightIcon />
          </Button>
          <Input type="text" className="h-6" />
        </div>
        <div className="text-muted-foreground text-xs">8850 results</div>
      </div>
      <Separator className="my-1" />
      <div className="flex flex-col gap-y-1"></div>
    </MainPanelsComponent>
  );
};

export default EntitySearchComponent;
