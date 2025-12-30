import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useAppConfigQuery = () => {
  return useQuery(orpc.appConfig.get.queryOptions());
};
