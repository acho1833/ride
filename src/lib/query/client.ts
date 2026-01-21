/**
 * TanStack Query Client Factory
 *
 * Creates configured QueryClient instances for the application.
 *
 * NOTE: This app uses CLIENT-SIDE data fetching only.
 * - No server-side prefetching
 * - No React Suspense for data fetching
 * - No SSR hydration
 * All data fetching happens in client components via React Query hooks.
 * The hydration/dehydration config below is kept for potential future use.
 */

import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import { serializer } from '@/lib/query/serializer';
import { IS_DEV } from '@/const';

/**
 * Creates a new QueryClient with application-specific defaults
 * @returns Configured QueryClient instance
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in development for faster feedback
        retry: IS_DEV ? 0 : 1,
        // Custom hash function using ORPC serializer for consistent keys
        queryKeyHashFn(queryKey) {
          const [json, meta] = serializer.serialize(queryKey);
          return JSON.stringify({ json, meta });
        },
        // Disable caching by default - queries that need caching should set staleTime individually
        staleTime: 0
      },
      mutations: {
        // Single attempt for all mutations - no retries
        retry: 0
      },
      // NOTE: Hydration config below is NOT currently used.
      // Kept for future use if server-side prefetching is needed.
      // SSR dehydration config - serialize server state for client hydration
      dehydrate: {
        shouldDehydrateQuery: query => defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        serializeData(data) {
          const [json, meta] = serializer.serialize(data);
          return { json, meta };
        }
      },
      // SSR hydration config - deserialize server state on client
      hydrate: {
        deserializeData(data) {
          return serializer.deserialize(data.json, data.meta);
        }
      }
    }
  });
}
