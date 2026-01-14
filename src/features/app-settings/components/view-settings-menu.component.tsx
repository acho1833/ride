'use client';

import { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useViewSettings } from '@/stores/app-settings/app-settings.selector';
import { useProjectViewSettingsMutation } from '@/features/projects/hooks/useProjectViewSettingsMutation';
import { useCurrentProject } from '@/stores/projects/projects.selector';
import { ViewSettingKey, DEFAULT_VIEW_SETTINGS, VIEW_SETTINGS_BY_POSITION } from '@/models/view-settings.model';

const ViewSettingsMenuComponent = () => {
  const viewSettings = useViewSettings();
  const currentProject = useCurrentProject();
  const { mutate: updateProject } = useProjectViewSettingsMutation();

  const handleToggle = (key: ViewSettingKey, checked: boolean) => {
    if (!currentProject) return;
    const currentView = viewSettings ?? DEFAULT_VIEW_SETTINGS;
    updateProject({
      id: currentProject.id,
      view: {
        ...currentView,
        [key]: checked
      }
    });
  };

  const getValue = (key: ViewSettingKey): boolean => {
    return viewSettings?.[key] ?? DEFAULT_VIEW_SETTINGS[key];
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {VIEW_SETTINGS_BY_POSITION.map((group, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            {group.map(item => (
              <div key={item.key} className="flex items-center justify-between gap-x-4 px-2 py-1.5">
                <Label className="text-sm">{item.label}</Label>
                <Switch checked={getValue(item.key)} onCheckedChange={checked => handleToggle(item.key, checked)} />
              </div>
            ))}
          </div>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default ViewSettingsMenuComponent;
