import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useSpreadlineRawDataQuery = (ego?: string) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: { ego } }));
};
