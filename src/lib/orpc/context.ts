/**
 * ORPC Request Context
 *
 * Creates context object available to all ORPC procedure handlers.
 * Used for passing request-specific data like user info to handlers.
 */

import type { NextRequest } from 'next/server';

/**
 * Creates the context object for ORPC handlers
 * @param req - The incoming Next.js request
 * @returns Context object with request for services to use
 */
export async function createContext(req: NextRequest) {
  return { req };
}

/** Type representing the context available in ORPC handlers */
export type Context = Awaited<ReturnType<typeof createContext>>;
