import 'server-only';

import AppSettingsCollection from '@/collections/app-settings.collection';
import type { AppSettings } from '@/models/app-settings.model';
import { DEFAULT_APP_SETTINGS } from '@/models/app-settings.model';
import { ViewSettingKey } from '@/models/view-settings.model';

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
 * Update app settings for a user (full document update).
 */
export async function updateAppSettings(sid: string, view: Record<ViewSettingKey, boolean>): Promise<AppSettings> {
  const settings = await AppSettingsCollection.findOneAndUpdate({ sid }, { $set: { view } }, { new: true, upsert: true });

  return settings!;
}
