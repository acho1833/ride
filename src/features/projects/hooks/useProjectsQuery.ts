import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching all projects for current user
 */
export const useProjectsQuery = () => {
  return useQuery(orpc.project.getAll.queryOptions());
};
