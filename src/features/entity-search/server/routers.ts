import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { entitySchema } from '@/models/entity.model';
import * as entityService from './services/entity.service';

/** API path prefix for all entity endpoints */
const API_ENTITY_PREFIX = '/entities';

/** OpenAPI tags for documentation grouping */
const tags = ['Entity'];

/** Zod schema for search response validation */
const entitySearchResponseSchema = z.object({
  entities: entitySchema.array(),
  totalCount: z.number(),
  pageNumber: z.number(),
  pageSize: z.number()
});

/**
 * Entity Router - oRPC procedures for entity operations.
 * These endpoints proxy requests to the external API (currently mocked).
 */
export const entityRouter = appProcedure.router({
  /**
   * GET /entities/:id - Get entity by ID with related entities.
   * Returns entity details including relatedEntities map.
   */
  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_ENTITY_PREFIX}/:id`,
      summary: 'Get entity by ID with related entities',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(entitySchema)
    .handler(async ({ input }) => {
      return entityService.getEntityById(input.id);
    }),

  /**
   * POST /entities/search - Search entities with filtering and pagination.
   * Returns paginated list of entities matching the search criteria.
   */
  search: appProcedure
    .route({
      method: 'POST',
      path: `${API_ENTITY_PREFIX}/search`,
      summary: 'Search entities with pagination',
      tags
    })
    .input(
      z.object({
        name: z.string(),
        types: z.array(z.string()).optional(),
        sortDirection: z.enum(['asc', 'desc']),
        pageSize: z.number(),
        pageNumber: z.number()
      })
    )
    .output(entitySearchResponseSchema)
    .handler(async ({ input }) => {
      return entityService.searchEntities(input);
    }),

  /**
   * GET /entities/types - Get available entity types for filtering.
   * Returns array of type strings (e.g., ["Person", "Organization"]).
   */
  getTypes: appProcedure
    .route({
      method: 'GET',
      path: `${API_ENTITY_PREFIX}/types`,
      summary: 'Get available entity types',
      tags
    })
    .output(z.array(z.string()))
    .handler(async () => {
      return entityService.getEntityTypes();
    })
});
