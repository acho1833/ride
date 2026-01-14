import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching a single project by ID
 */
export const useProjectQuery = (id: string) => {
  return useQuery({
    ...orpc.project.getById.queryOptions({ input: { id } }),
    enabled: !!id
  });
};
