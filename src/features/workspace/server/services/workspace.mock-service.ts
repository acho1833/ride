import 'server-only';

import type { EntityResponse } from '@/models/entity-response.model';
import type { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';
import { getDb } from '@/lib/mock-db';

// ============================================================================
// Per-workspace state persisted to SQLite
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

/** Read workspace state from SQLite */
function getWorkspaceState(sid: string, workspaceId: string): WorkspaceState {
  const db = getDb();
  const entityList = db
    .prepare(
      `SELECT entity_id as id, label_normalized as labelNormalized, type
       FROM workspace_entity WHERE sid = ? AND workspace_id = ?`
    )
    .all(sid, workspaceId) as EntityResponse[];

  const relationshipList = db
    .prepare(
      `SELECT relationship_id as relationshipId, predicate,
              source_entity_id as sourceEntityId, related_entity_id as relatedEntityId
       FROM workspace_relationship WHERE sid = ? AND workspace_id = ?`
    )
    .all(sid, workspaceId) as RelationshipResponse[];

  return { entityList, relationshipList };
}

/** Write workspace state to SQLite (replace all rows for this sid+workspace) */
function setWorkspaceState(sid: string, workspaceId: string, state: WorkspaceState): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM workspace_entity WHERE sid = ? AND workspace_id = ?').run(sid, workspaceId);
    db.prepare('DELETE FROM workspace_relationship WHERE sid = ? AND workspace_id = ?').run(sid, workspaceId);

    const insertEntity = db.prepare(
      'INSERT INTO workspace_entity (sid, workspace_id, entity_id, label_normalized, type) VALUES (?, ?, ?, ?, ?)'
    );
    for (const e of state.entityList) {
      insertEntity.run(sid, workspaceId, e.id, e.labelNormalized, e.type);
    }

    const insertRel = db.prepare(
      'INSERT INTO workspace_relationship (sid, workspace_id, relationship_id, predicate, source_entity_id, related_entity_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const r of state.relationshipList) {
      insertRel.run(sid, workspaceId, r.relationshipId, r.predicate, r.sourceEntityId, r.relatedEntityId);
    }
  });
  transaction();
}

/**
 * Find relationships from SQLite that connect the given entity
 * to entities already in the workspace.
 */
async function findConnectingRelationships(entityId: string, existingEntityIds: Set<string>): Promise<RelationshipResponse[]> {
  if (existingEntityIds.size === 0) return [];

  const db = getDb();
  const existingIds = [...existingEntityIds];
  const placeholders = existingIds.map(() => '?').join(', ');
  const relationships = db
    .prepare(
      `
    SELECT relationship_id as relationshipId, predicate,
           source_entity_id as sourceEntityId, related_entity_id as relatedEntityId
    FROM relationship
    WHERE (source_entity_id = ? AND related_entity_id IN (${placeholders}))
       OR (related_entity_id = ? AND source_entity_id IN (${placeholders}))
  `
    )
    .all(entityId, ...existingIds, entityId, ...existingIds) as RelationshipResponse[];

  return relationships;
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

  const existingEntityIds = new Set(state.entityList.map(e => e.id));
  const existingRelationshipIds = new Set(state.relationshipList.map(r => r.relationshipId));

  // Filter to only new entity IDs
  const newEntityIds = entityIds.filter(id => !existingEntityIds.has(id));
  if (newEntityIds.length === 0) {
    return getWorkspaceById(workspaceId, sid);
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
