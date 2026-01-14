import { FolderKanban } from 'lucide-react';
import { ModalNavItem } from './types';

/** Navigation items for project selector modal */
export const MODAL_NAV_ITEMS: ModalNavItem[] = [
  { id: 'projects', label: 'Projects', icon: FolderKanban }
  // Future: { id: 'configuration', label: 'Configuration', icon: Settings }
];

/** Project routes */
export const ROUTES = {
  IDE: '/ide'
} as const;

/** Avatar colors for project initials */
export const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500'
] as const;

/** Get a deterministic color for a project based on its name */
export const getProjectColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
