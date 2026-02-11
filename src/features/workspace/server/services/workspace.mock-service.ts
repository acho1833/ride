import 'server-only';

import type { EntityResponse } from '@/models/entity-response.model';
import type { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';
import { getDb } from '@/lib/mock-db';

// ============================================================================
// Per-workspace state persisted to SQLite as JSON TEXT
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

/** Read workspace state from SQLite (single JSON row) */
function getWorkspaceState(sid: string, workspaceId: string): WorkspaceState {
  const db = getDb();
  const row = db.prepare('SELECT data FROM workspace_state WHERE sid = ? AND workspace_id = ?').get(sid, workspaceId) as
    | { data: string }
    | undefined;

  if (!row) return { entityList: [], relationshipList: [] };
  return JSON.parse(row.data) as WorkspaceState;
}

/** Write workspace state to SQLite (single JSON row) */
function setWorkspaceState(sid: string, workspaceId: string, state: WorkspaceState): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO workspace_state (sid, workspace_id, data) VALUES (?, ?, ?)').run(
    sid,
    workspaceId,
    JSON.stringify(state)
  );
}

/**
 * Find relationships from SQLite that connect the given entity
 * to entities already in the workspace.
 */
async function findConnectingRelationships(entityId: string, existingEntityIds: Set<string>): Promise<RelationshipResponse[]> {
  if (existingEntityIds.size === 0) return [];

  const db = getDb();
  // Query all relationships involving this entity (uses indexed columns)
  const relationships = db
    .prepare(
      `SELECT relationship_id as relationshipId, predicate,
              source_entity_id as sourceEntityId, related_entity_id as relatedEntityId
       FROM relationship
       WHERE source_entity_id = ? OR related_entity_id = ?`
    )
    .all(entityId, entityId) as RelationshipResponse[];

  // Filter to only those connecting to existing workspace entities
  return relationships.filter(
    r =>
      (r.sourceEntityId === entityId && existingEntityIds.has(r.relatedEntityId)) ||
      (r.relatedEntityId === entityId && existingEntityIds.has(r.sourceEntityId))
  );
}

/** Build a WorkspaceResponse from in-memory state */
function toResponse(workspaceId: string, state: WorkspaceState): WorkspaceResponse {
  return {
    id: workspaceId,
    name: `Workspace ${workspaceId}`,
    entityList: state.entityList,
    relationshipList: state.relationshipList
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get workspace by ID.
 */
export async function getWorkspaceById(id: string, sid: string): Promise<WorkspaceResponse> {
  return toResponse(id, getWorkspaceState(sid, id));
}

/**
 * Add entities to workspace by IDs.
 * Automatically adds relationships that connect new entities to existing entities.
 */
export async function addEntitiesToWorkspace(workspaceId: string, entityIds: string[], sid: string): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(sid, workspaceId);

  const existingEntityIds = new Set(state.entityList.map(e => e.id));
  const existingRelationshipIds = new Set(state.relationshipList.map(r => r.relationshipId));

  // Filter to only new entity IDs
  const newEntityIds = entityIds.filter(id => !existingEntityIds.has(id));
  if (newEntityIds.length === 0) {
    return toResponse(workspaceId, state);
  }

  // Batch-fetch new entities from SQLite
  const db = getDb();
  const placeholders = newEntityIds.map(() => '?').join(', ');
  const newEntities = db
    .prepare(`SELECT id, label_normalized as labelNormalized, type FROM entity WHERE id IN (${placeholders})`)
    .all(...newEntityIds) as EntityResponse[];

  for (const entity of newEntities) {
    const entityResponse: EntityResponse = {
      id: entity.id,
      labelNormalized: entity.labelNormalized,
      type: entity.type
    };

    state.entityList.push(entityResponse);
    existingEntityIds.add(entity.id);

    const connectingRelationships = await findConnectingRelationships(entity.id, existingEntityIds);
    for (const rel of connectingRelationships) {
      if (!existingRelationshipIds.has(rel.relationshipId)) {
        state.relationshipList.push(rel);
        existingRelationshipIds.add(rel.relationshipId);
      }
    }
  }

  setWorkspaceState(sid, workspaceId, state);
  return toResponse(workspaceId, state);
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
  return toResponse(workspaceId, state);
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
  const state: WorkspaceState = { entityList: entities, relationshipList: relationships };
  setWorkspaceState(sid, workspaceId, state);
  return toResponse(workspaceId, state);
}
