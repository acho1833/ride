import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for deleting a project
 */
export const useProjectDeleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.project.delete.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Deleting project...') };
      },
      onSuccess: async (_data, _variables, context) => {
        // Invalidate projects list to refresh it
        await queryClient.invalidateQueries({ queryKey: orpc.project.getAll.queryKey() });
        toast.success('Project deleted', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to delete project', { id: context?.toastId });
      }
    })
  );
};
