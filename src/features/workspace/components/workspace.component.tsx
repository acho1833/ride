'use client';

/**
 * Workspace Component
 *
 * Data fetching wrapper for workspace graph.
 * Retrieves workspace data by workspaceId and passes to graph component.
 */

import { useWorkspaceQuery } from '../hooks/useWorkspaceQuery';
import WorkspaceGraphComponent from './workspace-graph.component';

interface Props {
  /** The workspaceId to fetch and display */
  workspaceId: string;
}

const WorkspaceComponent = ({ workspaceId }: Props) => {
  const { data: workspace, isPending, isError, error } = useWorkspaceQuery(workspaceId);

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading workspace...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-destructive">Error loading workspace: {error?.message ?? 'Unknown error'}</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Workspace not found</div>
      </div>
    );
  }

  return <WorkspaceGraphComponent workspace={workspace} />;
};

export default WorkspaceComponent;
