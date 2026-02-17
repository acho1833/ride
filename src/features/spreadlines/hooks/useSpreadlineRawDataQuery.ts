import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useSpreadlineRawDataQuery = (params: { egoId: string; relationTypes: string[]; yearRange: [number, number] }) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: params }));
};
