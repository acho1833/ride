import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { EntitySearchParams } from '../types';

/**
 * Hook for searching entities with pagination.
 * @param params - Search parameters (name, types, pageSize, pageNumber)
 * @param enabled - Whether to execute the query (default: true)
 * @returns Query result with entities, loading state, and pagination info
 */
export const useEntitySearchQuery = (params: EntitySearchParams, enabled: boolean = true) => {
  return useQuery({
    ...orpc.entity.search.queryOptions({ input: params }),
    enabled
  });
};
