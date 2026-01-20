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
 * Add nodes to workspace.
 */
export async function addNodesToWorkspace(workspaceId: string, nodeIds: string[]): Promise<Workspace> {
  const response = await mockService.addNodesToWorkspace(workspaceId, nodeIds);
  return toWorkspace(response);
}

/**
 * Remove nodes from workspace.
 */
export async function removeNodesFromWorkspace(workspaceId: string, nodeIds: string[]): Promise<Workspace> {
  const response = await mockService.removeNodesFromWorkspace(workspaceId, nodeIds);
  return toWorkspace(response);
}
