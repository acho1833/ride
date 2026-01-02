import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { orpc } from '@/lib/orpc/orpc';
import { useAppSettingsActions } from '@/stores/app-settings/app-settings.selector';

export const useAppSettingsUpdateMutation = () => {
  const queryClient = useQueryClient();
  const { setAppSettings } = useAppSettingsActions();

  return useMutation(
    orpc.appSettings.update.mutationOptions({
      onSuccess: async data => {
        await queryClient.invalidateQueries({ queryKey: orpc.appSettings.get.key() });
        setAppSettings(data);
      },
      onError: () => {
        toast.error('Failed to update settings');
      }
    })
  );
};
