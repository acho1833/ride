import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/app.store';

export const useFileDeleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.files.deleteNode.mutationOptions({
      onMutate: () => {
        return { toastId: toast.loading('Deleting file...') };
      },
      onSuccess: async (_data, variables, context) => {
        // Close deleted file(s) from open tabs
        const { closeFileFromAllGroups } = useAppStore.getState();
        const openFileIds = getOpenFileIds();

        // Close any open file that matches or is inside the deleted node
        for (const openFileId of openFileIds) {
          if (openFileId === variables.nodeId || openFileId.startsWith(variables.nodeId + '/')) {
            closeFileFromAllGroups(openFileId);
          }
        }

        await queryClient.invalidateQueries({
          queryKey: orpc.files.getTree.key()
        });
        toast.success('File deleted successfully', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to delete file', { id: context?.toastId });
      }
    })
  );
};

/** Get all open file IDs from the store */
function getOpenFileIds(): string[] {
  const { openFiles } = useAppStore.getState();
  const ids: string[] = [];
  for (const row of openFiles.rows) {
    for (const group of row.groups) {
      for (const file of group.files) {
        if (!ids.includes(file.id)) {
          ids.push(file.id);
        }
      }
    }
  }
  return ids;
}
