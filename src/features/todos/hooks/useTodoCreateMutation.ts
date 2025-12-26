/**
 * Todo Create Mutation Hook
 *
 * Provides mutation for creating new todos with optimistic UI updates.
 * Shows loading/success/error toasts and invalidates todo list cache.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';

/**
 * Hook for creating new todos
 * @returns Mutation object with mutate function and loading state
 */
export const useTodosCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.todo.create.mutationOptions({
      // Show loading toast immediately
      onMutate: () => {
        return { toastId: toast.loading('Creating todo...') };
      },
      // On success: refresh todo list and show success toast
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.key()
        });

        toast.success('Todo created', { id: context?.toastId });
      },
      // On error: show error toast
      onError: (error, variables, context) => {
        toast.error('Failed to create todo', { id: context?.toastId });
      }
    })
  );
};
