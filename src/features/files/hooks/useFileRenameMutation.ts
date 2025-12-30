import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileRenameMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.files.renameNode.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Renaming file...') };
      },
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.files.getTree.key()
        });
        toast.success('File renamed successfully', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to rename file', { id: context?.toastId });
      }
    })
  );
};
