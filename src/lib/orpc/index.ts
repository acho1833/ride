/**
 * ORPC Base Procedure
 *
 * Exports the base procedure with typed context for building API endpoints.
 * All feature routers should use this as their starting point.
 */

import { os } from '@orpc/server';
import type { Context } from './context';

/** Base procedure with app context - use this to define all API endpoints */
export const appProcedure = os.$context<Context>();
