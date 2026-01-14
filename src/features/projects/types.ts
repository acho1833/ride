import { LucideIcon } from 'lucide-react';

/** Modal navigation section identifier */
export type ModalSection = 'projects' | string;

/** Navigation item for modal left panel */
export interface ModalNavItem {
  id: ModalSection;
  label: string;
  icon?: LucideIcon;
}
