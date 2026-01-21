import 'server-only';

import { getMockEntities, MOCK_ENTITY_TYPES } from '@/lib/mock-data';
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
