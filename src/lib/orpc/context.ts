/**
 * ORPC Request Context
 *
 * Creates context object available to all ORPC procedure handlers.
 * Used for passing request-specific data like user info to handlers.
 */

import type { NextRequest } from 'next/server';

/**
 * Creates the context object for ORPC handlers
 * @param _req - The incoming Next.js request (can be used to extract auth info)
 * @returns Context object with user information
 */
export async function createContext(_req: NextRequest) {
  return {
    userId: 'user1'
  };
}

/** Type representing the context available in ORPC handlers */
export type Context = Awaited<ReturnType<typeof createContext>>;
