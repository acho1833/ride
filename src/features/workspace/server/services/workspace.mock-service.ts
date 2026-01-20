import 'server-only';

import { faker } from '@faker-js/faker';
import type { EntityResponse } from '@/models/entity-response.model';
import type { WorkspaceResponse, RelationshipResponse } from '@/models/workspace-response.model';

const FAKER_SEED = 12345;
const MOCK_ENTITY_TYPES = ['Person', 'Organization'];
const RELATIONSHIP_PREDICATES = ['works_for', 'knows', 'manages', 'reports_to', 'collaborates_with'];

// ============================================================================
// Global mock data pool (all available entities and relationships)
// ============================================================================

let cachedEntities: EntityResponse[] | null = null;
let cachedRelationships: RelationshipResponse[] | null = null;

function generateMockEntities(): EntityResponse[] {
  faker.seed(FAKER_SEED);
  const entities: EntityResponse[] = [];
  for (const type of MOCK_ENTITY_TYPES) {
    for (let i = 0; i < 300; i++) {
      entities.push({
        id: faker.string.uuid(),
        labelNormalized: type === 'Person' ? faker.person.fullName() : faker.company.name(),
        type
      });
    }
  }
  return entities;
}

function generateMockRelationships(entities: EntityResponse[]): RelationshipResponse[] {
  faker.seed(FAKER_SEED + 1);
  const relationships: RelationshipResponse[] = [];
  const targetCount = Math.floor(entities.length * 0.2);
  for (let i = 0; i < targetCount; i++) {
    const source = faker.helpers.arrayElement(entities);
    const target = faker.helpers.arrayElement(entities.filter(e => e.id !== source.id));
    relationships.push({
      relationshipId: faker.string.uuid(),
      predicate: faker.helpers.arrayElement(RELATIONSHIP_PREDICATES),
      sourceEntityId: source.id,
      relatedEntityId: target.id
    });
  }
  return relationships;
}

function getMockData(): { entities: EntityResponse[]; relationships: RelationshipResponse[] } {
  if (!cachedEntities || !cachedRelationships) {
    cachedEntities = generateMockEntities();
    cachedRelationships = generateMockRelationships(cachedEntities);
  }
  return { entities: cachedEntities, relationships: cachedRelationships };
}

// ============================================================================
// Per-workspace state (hashmap of workspace ID -> entities + relationships)
// ============================================================================

interface WorkspaceState {
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

const workspaceStateMap = new Map<string, WorkspaceState>();

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get or initialize workspace state.
 * On first access, generates initial subset of entities with relationships.
 */
function getWorkspaceState(workspaceId: string): WorkspaceState {
  if (!workspaceStateMap.has(workspaceId)) {
    const { entities } = getMockData();

    // Use workspace ID as seed for consistent initial subset
    faker.seed(hashString(workspaceId));
    const entityCount = faker.number.int({ min: 5, max: 10 });
    const selectedEntities = faker.helpers.arrayElements(entities, entityCount);

    // Generate relationships between selected entities (~40% connectivity)
    const generatedRelationships: RelationshipResponse[] = [];
    const targetLinkCount = Math.floor(selectedEntities.length * 0.6);

    for (let i = 0; i < targetLinkCount; i++) {
      const source = faker.helpers.arrayElement(selectedEntities);
      const target = faker.helpers.arrayElement(selectedEntities.filter(e => e.id !== source.id));
      if (target) {
        generatedRelationships.push({
          relationshipId: faker.string.uuid(),
          predicate: faker.helpers.arrayElement(RELATIONSHIP_PREDICATES),
          sourceEntityId: source.id,
          relatedEntityId: target.id
        });
      }
    }

    workspaceStateMap.set(workspaceId, {
      entityList: [...selectedEntities],
      relationshipList: generatedRelationships
    });
  }
  return workspaceStateMap.get(workspaceId)!;
}

/**
 * Find relationships from global pool that connect the given entity
 * to entities already in the workspace.
 */
function findConnectingRelationships(entityId: string, existingEntityIds: Set<string>): RelationshipResponse[] {
  const { relationships } = getMockData();
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
  const { entities } = getMockData();

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
export async function removeEntitiesFromWorkspace(
  workspaceId: string,
  entityIds: string[]
): Promise<WorkspaceResponse> {
  const state = getWorkspaceState(workspaceId);
  const entityIdsToRemove = new Set(entityIds);

  state.entityList = state.entityList.filter(e => !entityIdsToRemove.has(e.id));
  state.relationshipList = state.relationshipList.filter(
    r => !entityIdsToRemove.has(r.sourceEntityId) && !entityIdsToRemove.has(r.relatedEntityId)
  );

  return getWorkspaceById(workspaceId);
}
