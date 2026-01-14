import { z } from 'zod';

export interface AppSettings {
  id: string;
  sid: string;
  activeProjectId: string | null;
  updatedAt: Date;
}

/** Default app settings for new users */
export const DEFAULT_APP_SETTINGS = {
  activeProjectId: null
};

export const appSettingsSchema = z.object({
  id: z.string(),
  sid: z.string(),
  activeProjectId: z.string().nullable(),
  updatedAt: z.date()
});

/** Input type for updating app settings */
export interface AppSettingsUpdate {
  activeProjectId?: string | null;
}

/** Input schema for updating app settings (excludes id, sid, updatedAt) */
export const appSettingsUpdateSchema = z.object({
  activeProjectId: z.string().nullable().optional()
});
