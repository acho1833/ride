'use client';

import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ThemeSwitchComponent = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <div className="flex items-center justify-between gap-x-4 px-2 py-1.5">
      <Label className="text-sm">{isDark ? 'Dark' : 'Light'}</Label>
      <Switch checked={isDark} onCheckedChange={handleToggle} />
    </div>
  );
};

export default ThemeSwitchComponent;
