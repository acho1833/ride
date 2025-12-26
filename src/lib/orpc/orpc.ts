/**
 * ORPC Client Setup
 *
 * Configures the ORPC client for making API calls from the frontend.
 * Integrates with TanStack Query for caching and state management.
 */

import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { AppRouterClient } from '@/lib/orpc/router';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

/** RPC link configured with API endpoint URL (handles SSR vs client rendering) */
export const link = new RPCLink({
  url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/rpc`
});

/** Typed ORPC client for making API calls */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query utilities for ORPC - provides queryOptions and mutationOptions */
export const orpc = createTanstackQueryUtils(client);
