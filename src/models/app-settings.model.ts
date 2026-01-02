import { z } from 'zod';
import { ViewSettingKey, DEFAULT_VIEW_SETTINGS } from './view-settings.model';

export interface AppSettings {
  id: string;
  sid: string;
  view: Record<ViewSettingKey, boolean>;
  updatedAt: Date;
}

/** Default app settings for new users */
export const DEFAULT_APP_SETTINGS = {
  view: DEFAULT_VIEW_SETTINGS
};

export const appSettingsSchema = z.object({
  id: z.string(),
  sid: z.string(),
  view: z.record(z.string(), z.boolean()),
  updatedAt: z.date()
});

/** Input type for updating app settings */
export interface AppSettingsUpdate {
  view: Record<ViewSettingKey, boolean>;
}

/** Input schema for updating app settings (excludes id, sid, updatedAt) */
export const appSettingsUpdateSchema = z.object({
  view: z.record(z.string(), z.boolean())
});
