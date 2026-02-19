/**
 * ORPC Router Definition
 *
 * Central router that combines all feature routers.
 * Exports typed client interface for frontend usage.
 */

import type { RouterClient } from '@orpc/server';
import { appConfigRouter } from '@/features/app-config/server/routers';
import { appSettingsRouter } from '@/features/app-settings/server/routers';
import { entityRouter } from '@/features/entity-search/server/routers';
import { filesRouter } from '@/features/files/server/routers';
import { projectRouter } from '@/features/projects/server/routers';
import { todoRouter } from '@/features/todos/server/routers';
import { workspaceRouter } from '@/features/workspace/server/routers';
import { patternRouter } from '@/features/pattern-search/server/routers';
import { spreadlineRouter } from '@/features/spreadlines/server/routers';
import { spreadline2Router } from '@/features/spreadline2/server/routers';

/** Main application router combining all feature routers */
export const router = {
  appConfig: appConfigRouter,
  appSettings: appSettingsRouter,
  entity: entityRouter,
  files: filesRouter,
  project: projectRouter,
  todo: todoRouter,
  workspace: workspaceRouter,
  pattern: patternRouter,
  spreadline: spreadlineRouter,
  spreadline2: spreadline2Router
};

/** Type-safe client interface inferred from the router definition */
export type AppRouterClient = RouterClient<typeof router>;
