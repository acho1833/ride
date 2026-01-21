/**
 * Workspace Add Entities Mutation Hook
 *
 * Adds entities to a workspace and invalidates the workspace query
 * to refresh the graph with the new entities.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for adding entities to a workspace
 * @returns Mutation object with mutate function
 */
export const useWorkspaceAddEntitiesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspace.addEntities.mutationOptions({
      onMutate: () => ({ toastId: toast.loading('Adding entity...') }),
      onSuccess: async (data, _variables, context) => {
        await queryClient.invalidateQueries({ queryKey: orpc.workspace.getById.key({ input: { id: data.id } }) });
        toast.success('Entity added', { id: context?.toastId });
      },
      onError: (_error, _variables, context) => {
        toast.error('Failed to add entity', { id: context?.toastId });
      }
    })
  );
};
