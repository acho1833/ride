/**
 * ORPC Request Context
 *
 * Creates context object available to all ORPC procedure handlers.
 * Used for passing request-specific data like user info to handlers.
 */

import type { NextRequest } from 'next/server';

/**
 * Extracts the username from a Distinguished Name (DN) string.
 * The username is the last word in the CN (Common Name) value.
 */
function parseUsernameFromDN(dn: string): string {
  const cnMatch = dn.match(/CN=([^,]+)/i);
  if (!cnMatch) return dn;
  const cnValue = cnMatch[1].trim();
  const parts = cnValue.split(/\s+/);
  return parts[parts.length - 1];
}

/**
 * Creates the context object for ORPC handlers
 * @param req - The incoming Next.js request
 * @returns Context object with request and sid for services to use
 */
export async function createContext(req: NextRequest) {
  const headerName = process.env.CERT_CLIENT_DN_HEADER_NAME;
  const dn = (headerName && req.headers.get(headerName)) || process.env.DEV_USER || '';
  const sid = parseUsernameFromDN(dn);

  return { req, sid };
}

/** Type representing the context available in ORPC handlers */
export type Context = Awaited<ReturnType<typeof createContext>>;
