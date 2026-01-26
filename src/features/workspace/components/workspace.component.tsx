'use client';

/**
 * Workspace Component
 *
 * Data fetching wrapper for workspace graph.
 * Retrieves workspace data by workspaceId and passes to graph component.
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useWorkspaceQuery } from '../hooks/useWorkspaceQuery';
import { useWorkspaceViewStateMutation } from '../hooks/useWorkspaceViewStateMutation';
import { useWorkspaceAddEntitiesMutation } from '../hooks/useWorkspaceAddEntitiesMutation';
import { useWorkspaceRemoveEntitiesMutation } from '../hooks/useWorkspaceRemoveEntitiesMutation';
import { useSelectedEntityIds, useWorkspaceGraphActions } from '@/stores/workspace-graph/workspace-graph.selector';
import WorkspaceGraphComponent from './workspace-graph.component';
import WorkspaceContextMenuComponent from './workspace-context-menu.component';
import DeleteEntitiesDialogComponent from './delete-entities-dialog.component';
import type { WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
import type { Entity } from '@/models/entity.model';

interface Props {
  /** The workspaceId to fetch and display */
  workspaceId: string;
}

const WorkspaceComponent = ({ workspaceId }: Props) => {
  const { data: workspace, isPending, isError, error } = useWorkspaceQuery(workspaceId);
  const { mutate: saveViewState } = useWorkspaceViewStateMutation();
  const { mutate: addEntities } = useWorkspaceAddEntitiesMutation();
  const { mutate: removeEntities, isPending: isDeleting } = useWorkspaceRemoveEntitiesMutation();
  const selectedEntityIds = useSelectedEntityIds(workspaceId);
  const { setSelectedEntityIds, toggleEntitySelection, clearEntitySelection } = useWorkspaceGraphActions();
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Clear selection state when this workspace component unmounts (tab closed)
  useEffect(() => {
    return () => {
      clearEntitySelection(workspaceId);
    };
  }, [workspaceId, clearEntitySelection]);

  // Create entity map for O(1) lookups
  const entityMap = useMemo<Map<string, Entity>>(() => {
    if (!workspace) return new Map();
    return new Map(workspace.entityList.map(e => [e.id, e]));
  }, [workspace]);

  const handleSaveViewState = useCallback(
    (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => {
      saveViewState({ ...input, workspaceId });
    },
    [saveViewState, workspaceId]
  );

  const handleAddEntity = useCallback(
    (entityId: string, position: { x: number; y: number }) => {
      // Add entity to workspace
      addEntities({ workspaceId, entityIds: [entityId] });

      // Save position immediately so it appears at the drop location
      const currentPositions = workspace?.viewState?.entityPositions ?? {};
      saveViewState({
        workspaceId,
        scale: workspace?.viewState?.scale ?? 1,
        panX: workspace?.viewState?.panX ?? 0,
        panY: workspace?.viewState?.panY ?? 0,
        entityPositions: {
          ...currentPositions,
          [entityId]: position
        }
      });
    },
    [addEntities, saveViewState, workspaceId, workspace?.viewState]
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent, entityId?: string) => {
      // If right-clicked on entity, single-select it
      if (entityId) {
        setSelectedEntityIds(workspaceId, [entityId]);
      }
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    },
    [workspaceId, setSelectedEntityIds]
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    removeEntities(
      { workspaceId, entityIds: selectedEntityIds },
      {
        onSuccess: () => {
          clearEntitySelection(workspaceId);
          setDeleteDialogOpen(false);
        }
      }
    );
  }, [workspaceId, selectedEntityIds, removeEntities, clearEntitySelection]);

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

  return (
    <>
      <WorkspaceGraphComponent
        workspace={workspace}
        entityMap={entityMap}
        selectedEntityIds={selectedEntityIds}
        onSetSelectedEntityIds={ids => setSelectedEntityIds(workspaceId, ids)}
        onToggleEntitySelection={id => toggleEntitySelection(workspaceId, id)}
        onClearEntitySelection={() => clearEntitySelection(workspaceId)}
        onSaveViewState={handleSaveViewState}
        onAddEntity={handleAddEntity}
        onContextMenu={handleContextMenu}
      />
      <WorkspaceContextMenuComponent
        position={contextMenuPosition}
        onClose={handleContextMenuClose}
        selectedEntityCount={selectedEntityIds.length}
        onDelete={handleDeleteClick}
      />
      <DeleteEntitiesDialogComponent
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        entityCount={selectedEntityIds.length}
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </>
  );
};

export default WorkspaceComponent;
