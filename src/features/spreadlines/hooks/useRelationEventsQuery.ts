import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useRelationEventsQuery = (sourceId: string, targetId: string) => {
  return useQuery({
    ...orpc.spreadline.getRelationEvents.queryOptions({
      input: { sourceId, targetId }
    }),
    enabled: !!sourceId && !!targetId
  });
};
