import 'server-only';

import type { NextRequest } from 'next/server';

export interface AppConfig {
  user: {
    sid: string;
  };
}

/**
 * Extracts the username from a Distinguished Name (DN) string.
 * The username is the last word in the CN (Common Name) value.
 * @param dn - DN string like "CN=John Doe johndoe1,OU=Engineering,O=Company"
 * @returns Username extracted from CN (e.g., "johndoe1")
 */
function parseUsernameFromDN(dn: string): string {
  const cnMatch = dn.match(/CN=([^,]+)/i)!;
  const cnValue = cnMatch[1].trim();
  const parts = cnValue.split(/\s+/);
  return parts[parts.length - 1];
}

/**
 * Gets the app configuration including user info from request headers.
 * Falls back to DEV_USER env var if header is not present.
 */
export function getAppConfig(req: NextRequest): AppConfig {
  const headerName = process.env.CERT_CLIENT_DN_HEADER_NAME;
  const dn = (headerName && req.headers.get(headerName)) || process.env.DEV_USER || '';
  const sid = parseUsernameFromDN(dn);

  return {
    user: { sid }
  };
}
