import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

export const useFileTreeQuery = () => {
  return useQuery(orpc.files.getTree.queryOptions());
};
