import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import type { SpreadlineGranularity, SpreadlineSortOrder } from '@/features/spreadlines/const';

export const useSpreadlineRawDataQuery = (params: {
  egoId: string;
  relationTypes: string[];
  yearRange: [number, number];
  granularity?: SpreadlineGranularity;
  splitByAffiliation?: boolean;
  pageIndex?: number;
  pageSize?: number;
  hopLimit?: number;
  sortOrder?: SpreadlineSortOrder;
}) => {
  return useQuery(orpc.spreadline.getRawData.queryOptions({ input: params }));
};
