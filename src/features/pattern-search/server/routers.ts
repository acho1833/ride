import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { entitySchema } from '@/models/entity.model';
import { relationshipSchema } from '@/models/relationship.model';
import * as patternService from './services/pattern.service';

/** API path prefix for pattern search endpoints */
const API_PATTERN_PREFIX = '/patterns';

/** OpenAPI tags for documentation grouping */
const tags = ['Pattern Search'];

/** Zod schema for attribute filter */
const attributeFilterSchema = z.object({
  attribute: z.string(),
  patterns: z.array(z.string())
});

/** Zod schema for pattern node */
const patternNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string().nullable(),
  filters: z.array(attributeFilterSchema),
  position: z.object({ x: z.number(), y: z.number() })
});

/** Zod schema for pattern edge */
const patternEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  predicates: z.array(z.string())
});

/** Zod schema for search pattern */
const searchPatternSchema = z.object({
  nodes: z.array(patternNodeSchema),
  edges: z.array(patternEdgeSchema)
});

/** Zod schema for pattern match */
const patternMatchSchema = z.object({
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema)
});

/** Zod schema for pattern search response */
const patternSearchResponseSchema = z.object({
  matches: z.array(patternMatchSchema),
  totalCount: z.number(),
  pageNumber: z.number(),
  pageSize: z.number()
});

/**
 * Pattern Search Router - oRPC procedures for graph pattern matching.
 */
export const patternRouter = appProcedure.router({
  /**
   * POST /patterns/search - Search for pattern matches in the entity graph.
   * Returns paginated list of matches, each containing matched entities and relationships.
   */
  search: appProcedure
    .route({
      method: 'POST',
      path: `${API_PATTERN_PREFIX}/search`,
      summary: 'Search for pattern matches',
      tags
    })
    .input(
      z.object({
        pattern: searchPatternSchema,
        pageSize: z.number(),
        pageNumber: z.number(),
        sortAttribute: z.string().optional(),
        sortDirection: z.enum(['asc', 'desc']).optional()
      })
    )
    .output(patternSearchResponseSchema)
    .handler(async ({ input }) => {
      return patternService.searchPattern(input);
    }),

  /**
   * GET /patterns/predicates - Get available relationship predicates.
   * Returns array of predicate strings for the edge filter UI.
   */
  getPredicates: appProcedure
    .route({
      method: 'GET',
      path: `${API_PATTERN_PREFIX}/predicates`,
      summary: 'Get available relationship predicates',
      tags
    })
    .output(z.array(z.string()))
    .handler(async () => {
      return patternService.getPredicates();
    })
});
