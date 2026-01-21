'use client';

/**
 * Workspace Component
 *
 * Data fetching wrapper for workspace graph.
 * Retrieves workspace data by workspaceId and passes to graph component.
 */

import { useWorkspaceQuery } from '../hooks/useWorkspaceQuery';
import { useWorkspaceViewStateMutation } from '../hooks/useWorkspaceViewStateMutation';
import WorkspaceGraphComponent from './workspace-graph.component';
import type { WorkspaceViewStateInput } from '@/models/workspace-view-state.model';

interface Props {
  /** The workspaceId to fetch and display */
  workspaceId: string;
}

const WorkspaceComponent = ({ workspaceId }: Props) => {
  const { data: workspace, isPending, isError, error } = useWorkspaceQuery(workspaceId);
  const { mutate: saveViewState } = useWorkspaceViewStateMutation();

  const handleSaveViewState = (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => {
    saveViewState({ ...input, workspaceId });
  };

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

  return <WorkspaceGraphComponent workspace={workspace} onSaveViewState={handleSaveViewState} />;
};

export default WorkspaceComponent;
