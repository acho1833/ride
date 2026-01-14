import 'server-only';

import AppSettingsCollection from '@/collections/app-settings.collection';
import type { AppSettings, AppSettingsUpdate } from '@/models/app-settings.model';
import { DEFAULT_APP_SETTINGS } from '@/models/app-settings.model';

/**
 * Get app settings for a user. Creates with defaults if not exists.
 */
export async function getAppSettings(sid: string): Promise<AppSettings> {
  let settings = await AppSettingsCollection.findOne({ sid });

  if (!settings) {
    settings = await new AppSettingsCollection({
      sid,
      ...DEFAULT_APP_SETTINGS
    }).save();
  }

  return settings;
}

/**
 * Update app settings for a user.
 */
export async function updateAppSettings(sid: string, updates: AppSettingsUpdate): Promise<AppSettings> {
  const settings = await AppSettingsCollection.findOneAndUpdate({ sid }, { $set: updates }, { new: true, upsert: true });

  return settings!;
}
