/**
 * ORPC Router Definition
 *
 * Central router that combines all feature routers.
 * Exports typed client interface for frontend usage.
 */

import type { RouterClient } from '@orpc/server';
import { todoRouter } from '@/features/todos/server/routers';

/** Main application router combining all feature routers */
export const router = {
  todo: todoRouter
};

/** Type-safe client interface inferred from the router definition */
export type AppRouterClient = RouterClient<typeof router>;
