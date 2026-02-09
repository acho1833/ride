import type { EntityResponse } from '@/models/entity-response.model';
import type { RelationshipResponse } from '@/models/workspace-response.model';
import dummyData from './dummyData.json';
import googleOrgData from './googleOrgData.json';

/** Mock entity types */
export const MOCK_ENTITY_TYPES = ['Person', 'Organization'] as const;

/** Relationship predicates for generating mock relationships */
export const RELATIONSHIP_PREDICATES = ['works_for', 'knows', 'manages', 'reports_to', 'collaborates_with', 'part_of'] as const;

/** Combined entity pool (dummy + Google org data) */
const allEntities: EntityResponse[] = [...dummyData.entities, ...googleOrgData.entities];
const allRelationships: RelationshipResponse[] = [...dummyData.relationships, ...googleOrgData.relationships];

/**
 * Get the shared mock entity pool.
 * Combines dummyData.json and googleOrgData.json for consistent data across restarts.
 */
export function getMockEntities(): EntityResponse[] {
  return allEntities;
}

/**
 * Get entity by ID from the shared pool.
 */
export function getMockEntityById(id: string): EntityResponse | undefined {
  return getMockEntities().find(e => e.id === id);
}

/**
 * Get the shared mock relationships pool.
 * Combines dummyData.json and googleOrgData.json for consistent data across restarts.
 */
export function getMockRelationships(): RelationshipResponse[] {
  return allRelationships;
}
