/**
 * Workspace View State Mutation Hook
 *
 * Optimistic save for view state - updates React Query cache immediately
 * so the workspace graph doesn't re-run force layout on resize.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';
import type { Workspace } from '@/models/workspace.model';

/**
 * Hook for saving workspace view state
 * @returns Mutation object with mutate function
 */
export const useWorkspaceViewStateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspace.saveViewState.mutationOptions({
      onMutate: variables => {
        // Optimistically update the cache so workspace.viewState is immediately available
        const queryKey = orpc.workspace.getById.queryKey({ input: { id: variables.workspaceId } });
        queryClient.setQueryData<Workspace>(queryKey, old => {
          if (!old) return old;
          return {
            ...old,
            viewState: {
              // Keep existing metadata fields or use placeholders for new viewState
              id: old.viewState?.id ?? 'pending',
              workspaceId: variables.workspaceId,
              sid: old.viewState?.sid ?? '',
              updatedAt: old.viewState?.updatedAt ?? new Date(),
              // Update the actual view state values
              scale: variables.scale,
              panX: variables.panX,
              panY: variables.panY,
              entityPositions: variables.entityPositions
            }
          };
        });
      },
      onError: () => {
        toast.error('Failed to save view state');
      }
    })
  );
};
