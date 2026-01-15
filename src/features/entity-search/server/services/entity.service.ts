import 'server-only';

import { toEntity } from '@/models/entity.model';
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
