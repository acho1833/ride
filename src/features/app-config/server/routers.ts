import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import * as appConfigService from '@/features/app-config/server/services/app-config.service';

const API_APP_CONFIG_PREFIX = '/app-config';
const tags = ['AppConfig'];

export const appConfigRouter = appProcedure.router({
  get: appProcedure
    .route({
      method: 'GET',
      path: API_APP_CONFIG_PREFIX,
      summary: 'Get app configuration including user info',
      tags
    })
    .output(z.object({ user: z.object({ sid: z.string() }) }))
    .handler(async ({ context }) => {
      return appConfigService.getAppConfig(context.req);
    })
});
