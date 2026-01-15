import 'server-only';

import { EntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/** Mock entity types - in production this would come from external API */
const MOCK_ENTITY_TYPES = ['Person', 'Organization'];

/**
 * Generates deterministic mock entity data.
 * Creates entities with predictable names like "Person 1", "Organization 1".
 * This ensures the same data is returned on every call (no randomness).
 */
function generateMockEntities(personCount: number, orgCount: number): EntityResponse[] {
  const entities: EntityResponse[] = [];

  for (let i = 1; i <= personCount; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: `Person ${i}`,
      type: 'Person'
    });
  }

  for (let i = 1; i <= orgCount; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: `Organization ${i}`,
      type: 'Organization'
    });
  }

  return entities;
}

/** In-memory mock data: 75 Person + 75 Organization = 150 total entities */
const MOCK_ENTITIES = generateMockEntities(75, 75);

/**
 * Simulates external API search endpoint.
 * - Filters by name using case-sensitive "contains" match
 * - Filters by types (empty array = no filter, returns all types)
 * - Sorts results by labelNormalized (case-insensitive) based on sortDirection
 * - Applies pagination
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchMockResponse> {
  let filtered = [...MOCK_ENTITIES];

  // Filter by name (case-sensitive contains match)
  filtered = filtered.filter((e) => e.labelNormalized.includes(params.name));

  // Filter by types (empty array = show all)
  if (params.types && params.types.length > 0) {
    filtered = filtered.filter((e) => params.types!.includes(e.type));
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
