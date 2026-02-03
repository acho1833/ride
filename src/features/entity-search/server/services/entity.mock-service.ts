import 'server-only';

import { getMockEntities, getMockEntityById, getMockRelationships, MOCK_ENTITY_TYPES } from '@/lib/mock-data';
import type { Entity } from '@/models/entity.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/**
 * Checks if entity label matches the search pattern.
 * Supports trailing wildcard (*) for prefix matching.
 * - "Person*" matches "Person 1", "Person 2", etc.
 * - "Person" matches any label containing "Person" (contains match)
 */
function matchesNamePattern(label: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    // Wildcard: prefix match (case-insensitive)
    const prefix = pattern.slice(0, -1).toLowerCase();
    return label.toLowerCase().startsWith(prefix);
  }
  // Default: contains match (case-insensitive)
  return label.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Simulates external API search endpoint.
 * - Filters by name: supports trailing wildcard (*) for prefix match, otherwise contains match
 * - Filters by types (empty array = no filter, returns all types)
 * - Sorts results by labelNormalized (case-insensitive) based on sortDirection
 * - Applies pagination
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchMockResponse> {
  let filtered = [...getMockEntities()];

  // Filter by name (supports trailing wildcard for prefix match)
  if (params.name && params.name.trim() !== '') {
    const pattern = params.name.trim();
    filtered = filtered.filter(e => matchesNamePattern(e.labelNormalized, pattern));
  }

  // Filter by types (empty array = show all)
  if (params.types && params.types.length > 0) {
    filtered = filtered.filter(e => params.types!.includes(e.type));
  }

  // Sort by labelNormalized (case-insensitive) based on sortDirection
  filtered.sort((a, b) => {
    const comparison = a.labelNormalized.toLowerCase().localeCompare(b.labelNormalized.toLowerCase());
    return params.sortDirection === 'asc' ? comparison : -comparison;
  });

  // Apply pagination
  const totalCount = filtered.length;
  const startIndex = (params.pageNumber - 1) * params.pageSize;
  const paged = filtered.slice(startIndex, startIndex + params.pageSize);

  return {
    entities: paged,
    totalCount,
    pageNumber: params.pageNumber,
    pageSize: params.pageSize
  };
}

/**
 * Simulates external API endpoint to get available entity types.
 * Returns dynamic list of types from the external system.
 */
export async function getEntityTypes(): Promise<string[]> {
  return [...MOCK_ENTITY_TYPES];
}

/**
 * Get entity by ID with all related entities.
 * Returns the entity with a relatedEntities map containing all connected entities.
 */
export async function getEntityById(id: string): Promise<Entity | null> {
  const entity = getMockEntityById(id);
  if (!entity) return null;

  // Find all relationships involving this entity
  const relationships = getMockRelationships();
  const relatedEntityIds = new Set<string>();

  for (const rel of relationships) {
    if (rel.sourceEntityId === id) {
      relatedEntityIds.add(rel.relatedEntityId);
    } else if (rel.relatedEntityId === id) {
      relatedEntityIds.add(rel.sourceEntityId);
    }
  }

  // Build relatedEntities map
  const relatedEntities: Record<string, Entity> = {};
  for (const relatedId of relatedEntityIds) {
    const relatedEntity = getMockEntityById(relatedId);
    if (relatedEntity) {
      relatedEntities[relatedId] = {
        id: relatedEntity.id,
        labelNormalized: relatedEntity.labelNormalized,
        type: relatedEntity.type
      };
    }
  }

  return {
    id: entity.id,
    labelNormalized: entity.labelNormalized,
    type: entity.type,
    relatedEntities: Object.keys(relatedEntities).length > 0 ? relatedEntities : undefined
  };
}
