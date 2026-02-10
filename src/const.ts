/**
 * Application Constants
 *
 * Centralized configuration values used throughout the application.
 */

import { Share2, File, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Base path prefix for all API routes */
export const API_PREFIX = '/api';

/** Flag indicating if the app is running in development mode */
export const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Available file application types.
 * Used when creating new files to determine extension and editor.
 */
export const FILE_APPLICATIONS = [
  { id: 'workspace', label: 'Workspace', extension: '.ws', iconName: 'Share2' },
  { id: 'collaboration', label: 'Collaboration Graph', extension: '.gx', iconName: 'Users' },
  { id: 'text', label: 'Text Editor', extension: '.txt', iconName: 'File' }
] as const;

export type FileApplicationId = (typeof FILE_APPLICATIONS)[number]['id'];
export type FileApplicationIconName = (typeof FILE_APPLICATIONS)[number]['iconName'];

/** Default application when creating new files */
export const DEFAULT_FILE_APPLICATION_ID: FileApplicationId = 'workspace';

/** Icon mapping for file applications */
export const FILE_ICON_MAP: Record<string, LucideIcon> = {
  Share2,
  Users,
  File
};

/**
 * Get the icon component for a file based on its extension.
 * Returns the icon from FILE_ICON_MAP or File as fallback.
 */
export function getFileIcon(fileName: string): LucideIcon {
  const app = FILE_APPLICATIONS.find(a => fileName.endsWith(a.extension));
  return FILE_ICON_MAP[app?.iconName ?? 'File'] ?? File;
}

/**
 * Entity type icon configuration.
 * Maps entity types to Remix Icon CSS class and unicode for SVG rendering.
 * - cssClass: Used for CSS-based rendering (entity cards, search results)
 * - unicode: Used for SVG symbol definitions (D3 graph nodes)
 */
export const ENTITY_ICON_CONFIG: Record<string, { cssClass: string; unicode: string }> = {
  Person: { cssClass: 'ri-user-line', unicode: 'F264' },
  Organization: { cssClass: 'ri-building-2-line', unicode: 'EB09' },
  Vehicle: { cssClass: 'ri-car-line', unicode: 'EB3A' },
  Location: { cssClass: 'ri-map-pin-line', unicode: 'EF08' },
  Device: { cssClass: 'ri-smartphone-line', unicode: 'F15E' },
  Event: { cssClass: 'ri-calendar-event-line', unicode: 'EB1E' }
};

/** Default icon when entity type is not found */
export const DEFAULT_ENTITY_ICON = { cssClass: 'ri-question-line', unicode: 'f045' };
