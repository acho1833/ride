'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUiActions } from '@/stores/ui/ui.selector';

export function ToggleSwitch() {
  const { setToggleMode } = useUiActions();

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="airplane-mode"
        onCheckedChange={checked => {
          setToggleMode(checked);
        }}
      />
      <Label htmlFor="airplane-mode">Toggle Mode</Label>
    </div>
  );
}
