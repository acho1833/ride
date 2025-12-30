/**
 * ORPC Router Definition
 *
 * Central router that combines all feature routers.
 * Exports typed client interface for frontend usage.
 */

import type { RouterClient } from '@orpc/server';
import { appConfigRouter } from '@/features/app-config/server/routers';
import { filesRouter } from '@/features/files/server/routers';
import { todoRouter } from '@/features/todos/server/routers';

/** Main application router combining all feature routers */
export const router = {
  appConfig: appConfigRouter,
  files: filesRouter,
  todo: todoRouter
};

/** Type-safe client interface inferred from the router definition */
export type AppRouterClient = RouterClient<typeof router>;
