import { z } from 'zod';
import { FocusedPanelType, ToolType } from '@/features/toolbars/types';

/** Valid view setting keys - add/remove features here */
export type ViewSettingKey = 'entitySearch' | 'notification' | 'aiPrompt' | 'charts';

/** Array of all view setting keys for iteration */
export const VIEW_SETTING_KEYS: ViewSettingKey[] = ['entitySearch', 'notification', 'aiPrompt', 'charts'];

/** Default values for new users - all views enabled */
export const DEFAULT_VIEW_SETTINGS: Record<ViewSettingKey, boolean> = {
  entitySearch: true,
  notification: true,
  aiPrompt: true,
  charts: true
};

/** Toolbar position type */
export type ToolbarPosition = 'left' | 'right' | 'bottom';

/** Array of all toolbar positions for iteration */
export const TOOLBAR_POSITIONS: ToolbarPosition[] = ['left', 'right', 'bottom'];

/** View setting metadata for UI display */
export interface ViewSettingMeta {
  key: ViewSettingKey;
  label: string;
  position: ToolbarPosition;
}

/** View settings grouped by toolbar position for menu display */
export const VIEW_SETTINGS_CONFIG: ViewSettingMeta[] = [
  { key: 'entitySearch', label: 'Entity Search', position: 'left' },
  { key: 'notification', label: 'Notification', position: 'right' },
  { key: 'aiPrompt', label: 'AI Prompt', position: 'bottom' },
  { key: 'charts', label: 'Charts', position: 'bottom' }
];

/** View settings grouped by position for menu rendering */
export const VIEW_SETTINGS_BY_POSITION: ViewSettingMeta[][] = [
  VIEW_SETTINGS_CONFIG.filter(s => s.position === 'left'),
  VIEW_SETTINGS_CONFIG.filter(s => s.position === 'right'),
  VIEW_SETTINGS_CONFIG.filter(s => s.position === 'bottom')
];

export interface ViewSettings {
  id: string;
  sid: string;
  view: Record<ViewSettingKey, boolean>;
  updatedAt: Date;
}

export const viewSettingsSchema = z.object({
  id: z.string(),
  sid: z.string(),
  view: z.record(z.string(), z.boolean()),
  updatedAt: z.date()
});

/** Map ViewSettingKey to ToolType */
export const VIEW_SETTING_TO_TOOL_TYPE: Record<ViewSettingKey, ToolType> = {
  entitySearch: 'ENTITY_SEARCH',
  notification: 'ALERT',
  aiPrompt: 'PROMPT',
  charts: 'CHARTS'
};

/** Reverse mapping: ToolType to ViewSettingKey (for tools that have settings) */
export const TOOL_TYPE_TO_VIEW_SETTING: Partial<Record<ToolType, ViewSettingKey>> = {
  ENTITY_SEARCH: 'entitySearch',
  ALERT: 'notification',
  PROMPT: 'aiPrompt',
  CHARTS: 'charts'
  // FILES has no view setting - always visible
};

/** Map ToolType to FocusedPanelType for focus state management */
export const TOOL_TYPE_TO_FOCUS_PANEL: Record<ToolType, FocusedPanelType> = {
  FILES: 'files',
  ENTITY_SEARCH: 'entity-search',
  CHARTS: 'charts',
  PROMPT: 'prompt',
  ALERT: 'alerts'
};
