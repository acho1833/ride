/**
 * ORPC Base Procedure
 *
 * Exports the base procedure with typed context for building API endpoints.
 * All feature routers should use this as their starting point.
 * Includes global error handling middleware.
 */

import { os, ORPCError } from '@orpc/server';
import type { Context } from './context';

/** Base procedure with app context - use this to define all API endpoints */
export const appProcedure = os.$context<Context>().use(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // If already ORPCError, rethrow as-is
    if (error instanceof ORPCError) {
      throw error;
    }
    // Wrap unknown errors in ORPCError for consistent frontend handling
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});
