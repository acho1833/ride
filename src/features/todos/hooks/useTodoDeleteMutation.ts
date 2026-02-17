/**
 * Todo Delete Mutation Hook
 *
 * Provides mutation for deleting todos with loading feedback.
 * Shows loading/success/error toasts and invalidates todo list cache.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for deleting todos
 * @returns Mutation object with mutate function and loading state
 */
export const useTodosDeleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.todo.delete.mutationOptions({
      // Show loading toast immediately
      onMutate: () => {
        return { toastId: toast.loading('Deleting todo...') };
      },
      // On success: refresh todo list and show success toast
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.queryKey()
        });

        toast.success('Todo deleted', { id: context?.toastId });
      },
      // On error: show error toast
      onError: (_error, _variables, context) => {
        toast.error('Failed to delete todo', { id: context?.toastId });
      }
    })
  );
};
