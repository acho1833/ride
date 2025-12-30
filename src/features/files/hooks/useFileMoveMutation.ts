import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileMoveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.files.moveNode.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Moving file...') };
      },
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.files.getTree.key()
        });
        toast.success('File moved successfully', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to move file', { id: context?.toastId });
      }
    })
  );
};
