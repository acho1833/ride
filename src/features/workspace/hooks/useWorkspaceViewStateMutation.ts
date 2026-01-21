/**
 * Workspace View State Mutation Hook
 *
 * Optimistic save for view state - no query invalidation needed
 * since UI already reflects the current state.
 */

import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for saving workspace view state
 * @returns Mutation object with mutate function
 */
export const useWorkspaceViewStateMutation = () => {
  return useMutation(
    orpc.workspace.saveViewState.mutationOptions({
      onError: () => {
        toast.error('Failed to save view state');
      }
      // No onSuccess - optimistic update, UI already has current state
    })
  );
};
