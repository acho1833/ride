import 'server-only';

import { ORPCError } from '@orpc/server';
import { toWorkspace, type Workspace } from '@/models/workspace.model';
import type { WorkspaceViewState, WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
import WorkspaceViewStateCollection from '@/collections/workspace-view-state.collection';
import * as mockService from './workspace.mock-service';

/**
 * Get view state for a workspace.
 * Returns null if no saved state exists.
 */
export async function getViewStateByWorkspaceId(workspaceId: string, sid: string): Promise<WorkspaceViewState | null> {
  const viewState = await WorkspaceViewStateCollection.findOne({ workspaceId });
  if (viewState && viewState.sid !== sid) {
    throw new ORPCError('FORBIDDEN', { message: 'Not authorized to access this view state' });
  }
  return viewState;
}

/**
 * Save or update view state for a workspace.
 * Creates new record if none exists, updates if it does.
 */
export async function saveViewState(input: WorkspaceViewStateInput, sid: string): Promise<WorkspaceViewState> {
  const existing = await WorkspaceViewStateCollection.findOne({ workspaceId: input.workspaceId });

  if (existing) {
    if (existing.sid !== sid) {
      throw new ORPCError('FORBIDDEN', { message: 'Not authorized to modify this view state' });
    }
    existing.scale = input.scale;
    existing.panX = input.panX;
    existing.panY = input.panY;
    existing.entityPositions = input.entityPositions;
    return existing.save();
  }

  return new WorkspaceViewStateCollection({
    ...input,
    sid
  }).save();
}

/**
 * Delete view state for a workspace.
 * Called when workspace is deleted.
 */
export async function deleteViewState(workspaceId: string, sid: string): Promise<void> {
  const existing = await WorkspaceViewStateCollection.findOne({ workspaceId });
  if (existing && existing.sid !== sid) {
    throw new ORPCError('FORBIDDEN', { message: 'Not authorized to delete this view state' });
  }
  await WorkspaceViewStateCollection.deleteOne({ workspaceId });
}

/**
 * Get workspace by ID with merged view state.
 */
export async function getWorkspaceById(id: string, sid: string): Promise<Workspace> {
  const response = await mockService.getWorkspaceById(id);
  const workspace = toWorkspace(response);
  const viewState = await getViewStateByWorkspaceId(id, sid);
  return { ...workspace, viewState };
}

/**
 * Delete workspace and its view state.
 */
export async function deleteWorkspace(id: string, sid: string): Promise<void> {
  // Delete from external API (mock for now - just verify it exists)
  await mockService.getWorkspaceById(id);
  // Clean up view state from MongoDB
  await deleteViewState(id, sid);
}

/**
 * Add entities to workspace.
 */
export async function addEntitiesToWorkspace(workspaceId: string, entityIds: string[], sid: string): Promise<Workspace> {
  await mockService.addEntitiesToWorkspace(workspaceId, entityIds);
  return getWorkspaceById(workspaceId, sid);
}

/**
 * Remove entities from workspace.
 */
export async function removeEntitiesFromWorkspace(workspaceId: string, entityIds: string[], sid: string): Promise<Workspace> {
  await mockService.removeEntitiesFromWorkspace(workspaceId, entityIds);
  return getWorkspaceById(workspaceId, sid);
}
