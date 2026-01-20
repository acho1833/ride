import 'server-only';

import { toWorkspace, type Workspace } from '@/models/workspace.model';
import * as mockService from './workspace.mock-service';

/**
 * Get workspace by ID.
 */
export async function getWorkspaceById(id: string): Promise<Workspace> {
  const response = await mockService.getWorkspaceById(id);
  return toWorkspace(response);
}

/**
 * Add entities to workspace.
 */
export async function addEntitiesToWorkspace(workspaceId: string, entityIds: string[]): Promise<Workspace> {
  const response = await mockService.addEntitiesToWorkspace(workspaceId, entityIds);
  return toWorkspace(response);
}

/**
 * Remove entities from workspace.
 */
export async function removeEntitiesFromWorkspace(workspaceId: string, entityIds: string[]): Promise<Workspace> {
  const response = await mockService.removeEntitiesFromWorkspace(workspaceId, entityIds);
  return toWorkspace(response);
}
