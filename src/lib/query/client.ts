/**
 * TanStack Query Client Factory
 *
 * Creates configured QueryClient instances for the application.
 * Handles serialization for SSR hydration and caching strategies.
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
        // Prevent immediate refetch on component mount (1 minute stale time)
        staleTime: 60 * 1000
      },
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
