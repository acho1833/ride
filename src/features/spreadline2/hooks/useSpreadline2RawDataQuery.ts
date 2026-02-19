import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useSpreadline2RawDataQuery = (params: { egoId: string; relationTypes: string[]; yearRange: [number, number] }) => {
  return useQuery(orpc.spreadline2.getRawData.queryOptions({ input: params }));
};
