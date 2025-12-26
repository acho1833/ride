import EntitySearchComponent from '@/features/entity-search/components/entity-search.component';
import { cn } from '@/lib/utils';
import { ToolType } from '@/features/toolbars/types';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import NotificationsComponent from '@/features/notifications/components/notifications.component';
import PromptsComponent from '@/features/prompts/components/prompts.component';
import FilesComponent from '@/features/files/components/files.component';
import TypeTabContainer from '@/features/type-tabs/components/type-tab-container.component';

const leftToolbarTypes: ToolType[] = ['ENTITY_SEARCH', 'FILES'];
const rightToolbarTypes: ToolType[] = ['ALERT'];
const bottomToolbarTypes: ToolType[] = ['PROMPT', 'CHARTS'];

const ShowToolbarComponent = ({ toolType, pos }: { toolType: ToolType | null; pos: ToolbarPositions }) => {
  const isValidPosition = () => {
    if (!toolType) return false;

    switch (pos) {
      case 'left':
        return leftToolbarTypes.includes(toolType);
      case 'right':
        return rightToolbarTypes.includes(toolType);
      case 'bottom':
        return bottomToolbarTypes.includes(toolType);
      default:
        return false;
    }
  };

  if (!toolType || !isValidPosition()) {
    return null;
  }

  return (
    <div className="h-full">
      <div className={cn('hidden h-full', toolType === 'ENTITY_SEARCH' && 'block')}>
        <EntitySearchComponent pos={pos} />
      </div>
      <div className={cn('hidden h-full', toolType === 'ALERT' && 'block')}>
        <NotificationsComponent pos={pos} />
      </div>
      <div className={cn('hidden h-full', toolType === 'PROMPT' && 'block')}>
        <PromptsComponent pos={pos} />
      </div>
      {toolType === 'CHARTS' && (
        <div className={cn('hidden h-full', toolType === 'CHARTS' && 'block')}>
          <TypeTabContainer pos={pos} />
        </div>
      )}
      <div className={cn('hidden h-full', toolType === 'FILES' && 'block')}>
        <FilesComponent pos={pos} />
      </div>
    </div>
  );
};

export default ShowToolbarComponent;
