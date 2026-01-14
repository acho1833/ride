import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for opening a project (sets as active and updates lastOpenedAt)
 */
export const useProjectOpenMutation = () => {
  return useMutation(orpc.project.open.mutationOptions());
};
