import 'server-only';

import { faker } from '@faker-js/faker';
import type { EntityResponse } from '@/models/entity-response.model';

/** Random seed for deterministic fake data generation */
const FAKER_SEED = 12345;

/** Mock entity types */
export const MOCK_ENTITY_TYPES = ['Person', 'Organization'] as const;

/** Relationship predicates for generating mock relationships */
export const RELATIONSHIP_PREDICATES = ['works_for', 'knows', 'manages', 'reports_to', 'collaborates_with'] as const;

// Cached entities for consistent data across services
let cachedEntities: EntityResponse[] | null = null;

/**
 * Generates deterministic mock entity data using faker.
 * Uses a fixed seed so the same data is returned on every call.
 * IDs use format: person-{n} and org-{n} for consistency across services.
 */
function generateMockEntities(): EntityResponse[] {
  faker.seed(FAKER_SEED);
  const entities: EntityResponse[] = [];

  // Generate Person entities
  for (let i = 1; i <= 300; i++) {
    entities.push({
      id: `person-${i}`,
      labelNormalized: faker.person.fullName(),
      type: 'Person'
    });
  }

  // Generate Organization entities
  for (let i = 1; i <= 300; i++) {
    entities.push({
      id: `org-${i}`,
      labelNormalized: faker.company.name(),
      type: 'Organization'
    });
  }

  return entities;
}

/**
 * Get the shared mock entity pool.
 * Returns the same cached data on every call for consistency.
 */
export function getMockEntities(): EntityResponse[] {
  if (!cachedEntities) {
    cachedEntities = generateMockEntities();
  }
  return cachedEntities;
}

/**
 * Get entity by ID from the shared pool.
 */
export function getMockEntityById(id: string): EntityResponse | undefined {
  return getMockEntities().find(e => e.id === id);
}
