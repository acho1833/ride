/**
 * Todo Update Mutation Hook
 *
 * Provides mutation for updating todos with loading feedback.
 * Invalidates both the todo list and individual todo caches on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for updating existing todos
 * @returns Mutation object with mutate function and loading state
 */
export const useTodosUpdateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.todo.update.mutationOptions({
      // Show loading toast immediately
      onMutate: () => {
        return { toastId: toast.loading('Updating todo...') };
      },
      // On success: refresh both list and individual todo caches
      onSuccess: async (_data, variables, context) => {
        // Invalidate the todo list
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.key()
        });

        // Invalidate the specific todo's cache
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getById.key({
            input: {
              id: variables.id
            }
          })
        });

        toast.success('Todo updated', { id: context?.toastId });
      },
      // On error: show error toast
      onError: (_error, _variables, context) => {
        toast.error('Failed to update todo', { id: context?.toastId });
      }
    })
  );
};
