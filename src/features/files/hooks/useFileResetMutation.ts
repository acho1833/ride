import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileResetMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.files.reset.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Resetting file tree...') };
      },
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.files.getTree.key()
        });
        toast.success('File tree reset to default', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to reset file tree', { id: context?.toastId });
      }
    })
  );
};
