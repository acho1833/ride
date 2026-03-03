import 'server-only';

import { createHttpService } from '@/lib/http/http.service';

/**
 * Upstream default: single shared HTTP client pointed at the local mock API routes.
 *
 * Downstream projects override this file to:
 * - Point ENTITY_API_BASE at their real API domain
 * - Add authentication headers (Authorization, X-Client-ID, etc.)
 */
export const apiClient = createHttpService(`${process.env.ENTITY_API_BASE}`, {
  'Content-Type': 'application/json'
});
