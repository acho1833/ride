import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching entity details including related entities.
 * Used by entity detail popup to show expand button.
 * @param id - Entity ID to fetch
 * @returns Query result with entity data
 */
export const useEntityQuery = (id: string) => {
  return useQuery({
    ...orpc.entity.getById.queryOptions({ input: { id } }),
    enabled: !!id
  });
};
