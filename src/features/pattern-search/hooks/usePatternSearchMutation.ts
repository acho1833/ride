import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Mutation hook for executing pattern search.
 * Uses mutation instead of query because search is triggered on-demand.
 */
export const usePatternSearchMutation = () => {
  return useMutation(
    orpc.pattern.search.mutationOptions({
      onError: error => {
        toast.error(`Search failed: ${error.message}`);
      }
    })
  );
};
