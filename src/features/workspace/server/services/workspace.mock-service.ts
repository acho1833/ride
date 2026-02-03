import 'server-only';

import type { EntityResponse } from '@/models/entity-response.model';
import type { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';
import { getMockEntities, getMockRelationships } from '@/lib/mock-data';

// ============================================================================
// Per-workspace state (hashmap of workspace ID -> entities + relationships)
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

const workspaceStateMap = new Map<string, WorkspaceState>();

/**
 * Get or initialize workspace state.
 * New workspaces start empty - entities are added via drag-drop or expand.
 */
function getWorkspaceState(workspaceId: string): WorkspaceState {
  if (!workspaceStateMap.has(workspaceId)) {
    workspaceStateMap.set(workspaceId, {
      entityList: [],
      relationshipList: []
    });
  }
  return workspaceStateMap.get(workspaceId)!;
}

/**
 * Find relationships from global pool that connect the given entity
 * to entities already in the workspace.
 */
function findConnectingRelationships(entityId: string, existingEntityIds: Set<string>): RelationshipResponse[] {
  const relationships = getMockRelationships();
  return relationships.filter(
    r =>
      (r.sourceEntityId === entityId && existingEntityIds.has(r.relatedEntityId)) ||
      (r.relatedEntityId === entityId && existingEntityIds.has(r.sourceEntityId))
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get workspace by ID.
 */
export async function getWorkspaceById(id: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(id);
  return {
    id,
    name: `Workspace ${id}`,
    entityList: state.entityList,
    relationshipList: state.relationshipList
  };
}

/**
 * Add entities to workspace by IDs.
 * Automatically adds relationships that connect new entities to existing entities.
 */
export async function addEntitiesToWorkspace(workspaceId: string, entityIds: string[]): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const entities = getMockEntities();

  const existingEntityIds = new Set(state.entityList.map(e => e.id));
  const existingRelationshipIds = new Set(state.relationshipList.map(r => r.relationshipId));

  for (const entityId of entityIds) {
    if (existingEntityIds.has(entityId)) continue;

    const entity = entities.find(e => e.id === entityId);
    if (!entity) continue;

    state.entityList.push(entity);
    existingEntityIds.add(entityId);

    const connectingRelationships = findConnectingRelationships(entityId, existingEntityIds);
    for (const rel of connectingRelationships) {
      if (!existingRelationshipIds.has(rel.relationshipId)) {
        state.relationshipList.push(rel);
        existingRelationshipIds.add(rel.relationshipId);
      }
    }
  }

  return getWorkspaceById(workspaceId);
}

/**
 * Remove entities from workspace by IDs.
 * Automatically removes relationships where either endpoint is removed.
 */
export async function removeEntitiesFromWorkspace(workspaceId: string, entityIds: string[]): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const entityIdsToRemove = new Set(entityIds);

  state.entityList = state.entityList.filter(e => !entityIdsToRemove.has(e.id));
  state.relationshipList = state.relationshipList.filter(
    r => !entityIdsToRemove.has(r.sourceEntityId) && !entityIdsToRemove.has(r.relatedEntityId)
  );

  return getWorkspaceById(workspaceId);
}
