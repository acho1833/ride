import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching available entity types.
 * Used to populate the type filter dropdown in search form.
 * Cached indefinitely (staleTime: Infinity) since entity types rarely change.
 * @returns Query result with array of type strings
 */
export const useEntityTypesQuery = () => {
  return useQuery({
    ...orpc.entity.getTypes.queryOptions(),
    staleTime: Infinity
  });
};
