import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { useCurrentProject } from '@/stores/projects/projects.selector';

export const useFileTreeQuery = () => {
  const currentProject = useCurrentProject();
  const projectId = currentProject?.id ?? '';

  return useQuery({
    ...orpc.files.getTree.queryOptions({ input: { projectId } }),
    enabled: !!projectId
  });
};
