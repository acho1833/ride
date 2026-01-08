/**
 * Application Constants
 *
 * Centralized configuration values used throughout the application.
 */

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
  { id: 'text', label: 'Text Editor', extension: '.txt', iconName: 'File' }
] as const;

export type FileApplicationId = (typeof FILE_APPLICATIONS)[number]['id'];

/** Default application when creating new files */
export const DEFAULT_FILE_APPLICATION_ID: FileApplicationId = 'workspace';
