import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for updating a project
 */
export const useProjectUpdateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.project.update.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Updating project...') };
      },
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.project.getAll.key()
        });
        toast.success('Project updated', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to update project', { id: context?.toastId });
      }
    })
  );
};
