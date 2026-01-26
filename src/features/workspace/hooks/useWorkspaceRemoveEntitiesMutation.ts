/**
 * Workspace Remove Entities Mutation Hook
 *
 * Removes entities from a workspace with optimistic updates.
 * Entities disappear immediately; reappear if API fails.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';
import type { Workspace } from '@/models/workspace.model';

/**
 * Hook for removing entities from a workspace
 * @returns Mutation object with mutate function
 */
export const useWorkspaceRemoveEntitiesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspace.removeEntities.mutationOptions({
      onMutate: variables => {
        const toastId = toast.loading('Deleting...');
        const queryKey = orpc.workspace.getById.queryKey({ input: { id: variables.workspaceId } });

        // Snapshot for rollback, then optimistically remove entities
        const previousWorkspace = queryClient.getQueryData<Workspace>(queryKey);
        queryClient.setQueryData<Workspace>(queryKey, old =>
          old
            ? {
                ...old,
                entityList: old.entityList.filter(e => !variables.entityIds.includes(e.id)),
                relationshipList: old.relationshipList.filter(
                  r => !variables.entityIds.includes(r.sourceEntityId) && !variables.entityIds.includes(r.relatedEntityId)
                )
              }
            : old
        );

        return { toastId, previousWorkspace };
      },
      onSuccess: async (_data, _variables, context) => {
        toast.success('Entities deleted', { id: context?.toastId });
      },
      onError: (_error, variables, context) => {
        // Rollback on error
        if (context?.previousWorkspace) {
          queryClient.setQueryData(orpc.workspace.getById.queryKey({ input: { id: variables.workspaceId } }), context.previousWorkspace);
        }
        toast.error('Failed to delete entities', { id: context?.toastId });
      }
    })
  );
};
