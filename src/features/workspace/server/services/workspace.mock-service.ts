import 'server-only';

import * as fs from 'fs';
import * as path from 'path';
import type { EntityResponse } from '@/models/entity-response.model';
import type { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';
import { getMockEntities, getMockRelationships } from '@/lib/mock-data';

// ============================================================================
// Per-workspace state persisted to JSON file
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

const STATE_FILE_PATH = path.join(process.cwd(), 'src/lib/mock-data/workspaceState.json');

/** Load all workspace states from JSON file */
function loadStateFromFile(): Record<string, WorkspaceState> {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'));
    }
  } catch {
    // File doesn't exist or is invalid - start fresh
  }
  return {};
}

/** Save all workspace states to JSON file */
function saveStateToFile(states: Record<string, WorkspaceState>): void {
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(states, null, 2));
}

/** Build a storage key scoped by user and workspace */
function stateKey(sid: string, workspaceId: string): string {
  return `${sid}:${workspaceId}`;
}

/**
 * Get or initialize workspace state.
 * New workspaces start empty - entities are added via drag-drop or expand.
 */
function getWorkspaceState(sid: string, workspaceId: string): WorkspaceState {
  const states = loadStateFromFile();
  const key = stateKey(sid, workspaceId);
  if (!states[key]) {
    states[key] = { entityList: [], relationshipList: [] };
    saveStateToFile(states);
  }
  return states[key];
}

/** Update workspace state and persist */
function setWorkspaceState(sid: string, workspaceId: string, state: WorkspaceState): void {
  const states = loadStateFromFile();
  states[stateKey(sid, workspaceId)] = state;
  saveStateToFile(states);
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
export async function getWorkspaceById(id: string, sid: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(sid, id);
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
export async function addEntitiesToWorkspace(workspaceId: string, entityIds: string[], sid: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(sid, workspaceId);
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

  setWorkspaceState(sid, workspaceId, state);
  return getWorkspaceById(workspaceId, sid);
}

/**
 * Remove entities from workspace by IDs.
 * Automatically removes relationships where either endpoint is removed.
 */
export async function removeEntitiesFromWorkspace(workspaceId: string, entityIds: string[], sid: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(sid, workspaceId);
  const entityIdsToRemove = new Set(entityIds);

  state.entityList = state.entityList.filter(e => !entityIdsToRemove.has(e.id));
  state.relationshipList = state.relationshipList.filter(
    r => !entityIdsToRemove.has(r.sourceEntityId) && !entityIdsToRemove.has(r.relatedEntityId)
  );

  setWorkspaceState(sid, workspaceId, state);
  return getWorkspaceById(workspaceId, sid);
}

/**
 * Set workspace data directly (for creating from search results).
 * Replaces any existing data in the workspace.
 */
export async function setWorkspaceData(
  workspaceId: string,
  entities: EntityResponse[],
  relationships: RelationshipResponse[],
  sid: string
): Promise<WorkspaceResponse> {
  setWorkspaceState(sid, workspaceId, {
    entityList: entities,
    relationshipList: relationships
  });
  return getWorkspaceById(workspaceId, sid);
}
