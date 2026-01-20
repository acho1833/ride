import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useWorkspaceQuery = (workspaceId: string) => {
  return useQuery(orpc.workspace.getById.queryOptions({ input: { id: workspaceId } }));
};
