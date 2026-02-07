import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Mutation hook for populating a workspace with entities and relationships.
 * Used when creating a workspace from search results.
 */
export const useWorkspaceCreateWithDataMutation = () => {
  return useMutation(
    orpc.workspace.createWithData.mutationOptions({
      onError: error => {
        toast.error(`Failed to populate workspace: ${error.message}`);
      }
    })
  );
};
