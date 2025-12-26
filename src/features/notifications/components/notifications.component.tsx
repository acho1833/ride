import { ToolbarPositions } from '@/stores/ui/ui.store';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';

interface Props {
  pos: ToolbarPositions;
}

const NotificationsComponent = ({ pos }: Props) => {
  return (
    <MainPanelsComponent title="Notifications" pos={pos}>
      <div>Notifications 1</div>
      <div>Notifications 2</div>
    </MainPanelsComponent>
  );
};

export default NotificationsComponent;
