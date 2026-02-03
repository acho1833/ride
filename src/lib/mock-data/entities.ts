import type { EntityResponse } from '@/models/entity-response.model';
import type { RelationshipResponse } from '@/models/workspace-response.model';
import dummyData from './dummyData.json';

/** Mock entity types */
export const MOCK_ENTITY_TYPES = ['Person', 'Organization'] as const;

/** Relationship predicates for generating mock relationships */
export const RELATIONSHIP_PREDICATES = ['works_for', 'knows', 'manages', 'reports_to', 'collaborates_with'] as const;

/**
 * Get the shared mock entity pool.
 * Loads from dummyData.json for consistent data across restarts.
 */
export function getMockEntities(): EntityResponse[] {
  return dummyData.entities;
}

/**
 * Get entity by ID from the shared pool.
 */
export function getMockEntityById(id: string): EntityResponse | undefined {
  return getMockEntities().find(e => e.id === id);
}

/**
 * Get the shared mock relationships pool.
 * Loads from dummyData.json for consistent data across restarts.
 */
export function getMockRelationships(): RelationshipResponse[] {
  return dummyData.relationships;
}
