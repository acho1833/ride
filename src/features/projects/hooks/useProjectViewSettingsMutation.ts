import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { useProjectActions } from '@/stores/projects/projects.selector';

/**
 * Hook for updating project view settings.
 * Silent mutation (no toasts) - updates are reflected immediately via Zustand store.
 */
export const useProjectViewSettingsMutation = () => {
  const queryClient = useQueryClient();
  const { setCurrentProject } = useProjectActions();

  return useMutation(
    orpc.project.update.mutationOptions({
      onSuccess: async data => {
        // Update Zustand store with updated project (for immediate UI feedback)
        setCurrentProject(data);
        // Invalidate queries for consistency
        await queryClient.invalidateQueries({
          queryKey: orpc.project.getAll.key()
        });
      }
    })
  );
};
