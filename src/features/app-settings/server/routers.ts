import 'server-only';

import { appProcedure } from '@/lib/orpc';
import { appSettingsSchema, appSettingsUpdateSchema, AppSettingsUpdate } from '@/models/app-settings.model';
import * as appSettingsService from '@/features/app-settings/server/services/app-settings.service';

const API_APP_SETTINGS_PREFIX = '/app-settings';
const tags = ['AppSettings'];

export const appSettingsRouter = appProcedure.router({
  get: appProcedure
    .route({
      method: 'GET',
      path: API_APP_SETTINGS_PREFIX,
      summary: 'Get app settings for current user',
      tags
    })
    .output(appSettingsSchema)
    .handler(async ({ context }) => {
      return appSettingsService.getAppSettings(context.sid);
    }),

  update: appProcedure
    .route({
      method: 'PUT',
      path: API_APP_SETTINGS_PREFIX,
      summary: 'Update app settings for current user',
      tags
    })
    .input(appSettingsUpdateSchema)
    .output(appSettingsSchema)
    .handler(async ({ context, input }) => {
      const typedInput = input as AppSettingsUpdate;
      return appSettingsService.updateAppSettings(context.sid, typedInput);
    })
});
