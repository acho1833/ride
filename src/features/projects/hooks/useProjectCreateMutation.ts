import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for creating a new project
 */
export const useProjectCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.project.create.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Creating project...') };
      },
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.project.getAll.key()
        });
        toast.success('Project created', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to create project', { id: context?.toastId });
      }
    })
  );
};
