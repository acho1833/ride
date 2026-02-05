import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching entity details including related entities.
 * Used by entity detail popup to show expand button.
 * @param id - Entity ID to fetch
 * @param groupRelatedEntitiesBy - How to group related entities: 'type' (default) or 'predicate'
 * @returns Query result with entity data
 */
export const useEntityQuery = (id: string, groupRelatedEntitiesBy: 'type' | 'predicate' = 'type') => {
  return useQuery({
    ...orpc.entity.getById.queryOptions({ input: { id, groupRelatedEntitiesBy } }),
    enabled: !!id
  });
};
