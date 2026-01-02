import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useAppSettingsQuery = () => {
  return useQuery(orpc.appSettings.get.queryOptions());
};
