import ThemeToggleButtonComponent from '@/components/buttons/theme-toggle-button.component';
import { ApertureIcon } from 'lucide-react';

const AppHeaderComponent = () => {
  return (
    <div className="flex items-center justify-between gap-x-2 p-1">
      <div className="text-primary flex items-center gap-x-1">
        <ApertureIcon className="size-4" />
        <div className="text-[15px] font-bold">KX</div>
      </div>
      {/*<ToggleSwitch />*/}
      <div className="flex items-center gap-x-1">
        <ThemeToggleButtonComponent />
      </div>
    </div>
  );
};

export default AppHeaderComponent;
