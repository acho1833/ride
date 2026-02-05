import 'server-only';

import { ORPCError } from '@orpc/server';
import { toEntity, type Entity, type RelatedEntity } from '@/models/entity.model';
import type { EntityResponse } from '@/models/entity-response.model';
import { EntitySearchParams, EntitySearchResponse } from '../../types';
import * as mockService from './entity.mock-service';

/**
 * Search entities - calls mock service and converts response to Entity model.
 * This service layer acts as the boundary between external API and our app.
 * Errors are handled by global error middleware in src/lib/orpc/index.ts
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchResponse> {
  const mockResponse = await mockService.searchEntities(params);
  return {
    entities: mockResponse.entities.map(toEntity),
    totalCount: mockResponse.totalCount,
    pageNumber: mockResponse.pageNumber,
    pageSize: mockResponse.pageSize
  };
}

/**
 * Get available entity types from external API.
 * Errors are handled by global error middleware in src/lib/orpc/index.ts
 */
export async function getEntityTypes(): Promise<string[]> {
  return mockService.getEntityTypes();
}

/**
 * Transforms flat relatedEntities array from external API to grouped structure.
 * @param response - Entity response from external API with flat relatedEntities array
 * @param groupBy - How to group: 'type' groups by entity type, 'predicate' groups by relationship type
 * @returns Grouped relatedEntities map
 */
function groupRelatedEntities(
  response: EntityResponse,
  groupBy: 'type' | 'predicate'
): Record<string, RelatedEntity[]> | undefined {
  if (!response.relatedEntities || response.relatedEntities.length === 0) {
    return undefined;
  }

  const grouped: Record<string, RelatedEntity[]> = {};

  for (const rel of response.relatedEntities) {
    // Determine grouping key: entity type or relationship type (predicate)
    const key = groupBy === 'type' ? rel.entity.type : rel.type;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    // Transform to RelatedEntity: map rel.type to predicate
    grouped[key].push({
      id: rel.entity.id,
      labelNormalized: rel.entity.labelNormalized,
      type: rel.entity.type,
      predicate: rel.type
    });
  }

  return grouped;
}

/**
 * Get entity by ID with related entities.
 * Transforms external API response (flat array) to grouped structure.
 * @param id - Entity ID to fetch
 * @param groupBy - How to group related entities: 'type' or 'predicate'
 */
export async function getEntityById(id: string, groupBy: 'type' | 'predicate'): Promise<Entity> {
  const response = await mockService.getEntityById(id);
  if (!response) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Entity not found',
      data: { id }
    });
  }

  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type,
    relatedEntities: groupRelatedEntities(response, groupBy)
  };
}
