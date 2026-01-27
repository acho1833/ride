import EntitySearchComponent from '@/features/entity-search/components/entity-search.component';
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

  // Render only the active tool component (avoid mounting hidden components)
  switch (toolType) {
    case 'ENTITY_SEARCH':
      return <EntitySearchComponent pos={pos} />;
    case 'ALERT':
      return <NotificationsComponent pos={pos} />;
    case 'PROMPT':
      return <PromptsComponent pos={pos} />;
    case 'CHARTS':
      return <TypeTabContainer pos={pos} />;
    case 'FILES':
      return <FilesComponent pos={pos} />;
    default:
      return null;
  }
};

export default ShowToolbarComponent;
