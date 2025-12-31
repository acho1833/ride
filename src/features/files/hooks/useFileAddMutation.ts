import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

export const useFileAddMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.files.addNode.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Adding file...') };
      },
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.files.getTree.key()
        });
        toast.success('File added successfully', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        // Dismiss loading toast - error is displayed in form
        toast.dismiss(context?.toastId);
      }
    })
  );
};
