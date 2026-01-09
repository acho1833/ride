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
