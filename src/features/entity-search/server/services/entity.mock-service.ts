import 'server-only';

import { faker } from '@faker-js/faker';
import { EntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchMockResponse } from '../../types';

/** Random seed for deterministic fake data generation */
const FAKER_SEED = 12345;

/** Mock entity types - in production this would come from external API */
const MOCK_ENTITY_TYPES = ['Person', 'Organization'];

/**
 * Generates deterministic mock entity data using faker.
 * Uses a fixed seed so the same data is returned on every call.
 */
function generateMockEntities(personCount: number, orgCount: number): EntityResponse[] {
  faker.seed(FAKER_SEED);
  const entities: EntityResponse[] = [];

  for (let i = 1; i <= personCount; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    });
  }

  for (let i = 1; i <= orgCount; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    });
  }

  return entities;
}

/** In-memory mock data: 300 Person + 300 Organization = 600 total entities */
const MOCK_ENTITIES = generateMockEntities(300, 300);

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
  let filtered = [...MOCK_ENTITIES];

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
