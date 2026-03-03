import 'server-only';

import { ORPCError } from '@orpc/server';
import type { Entity } from '@/models/entity.model';
import { apiClient } from '@/lib/http/overrides/api-client';
import { EntitySearchParams, EntitySearchResponse } from '../../types';
import { ENTITY_ENDPOINTS } from '../../const';

/**
 * Search entities via the external API.
 * Returns paginated Entity results including dynamic attributes.
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchResponse> {
  return apiClient.post<EntitySearchResponse>(ENTITY_ENDPOINTS.SEARCH, params);
}

/**
 * Get available entity types from the external API.
 */
export async function getEntityTypes(): Promise<string[]> {
  return apiClient.get<string[]>(ENTITY_ENDPOINTS.TYPES);
}

/**
 * Get entity by ID with grouped related entities from the external API.
 * @param id - Entity ID to fetch
 * @param groupBy - How to group related entities: 'type' or 'predicate'
 */
export async function getEntityById(id: string, groupBy: 'type' | 'predicate'): Promise<Entity> {
  try {
    return await apiClient.get<Entity>(ENTITY_ENDPOINTS.GET_BY_ID(id), { params: { groupBy } });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Entity not found',
        data: { id }
      });
    }
    throw err;
  }
}
