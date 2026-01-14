import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for opening a project (sets as active and updates lastOpenedAt)
 */
export const useProjectOpenMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.project.open.mutationOptions({
      onSuccess: async () => {
        // Clear all queries to ensure fresh data for new project
        queryClient.clear();
      }
    })
  );
};
