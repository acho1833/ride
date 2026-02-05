import { z } from 'zod';

/**
 * EntityResponse represents the raw response from the external API.
 * This is separate from Entity to allow the external API response
 * structure to evolve independently from our internal Entity model.
 */
export interface EntityResponse {
  id: string;
  labelNormalized: string;
  type: string;
  /** Related entities - flat array from external API (only on getById) */
  relatedEntities?: RelatedEntityResponse[];
}

/**
 * RelatedEntityResponse from external API.
 * Contains the relationship type and the related entity.
 */
export interface RelatedEntityResponse {
  /** The relationship type/predicate (e.g., "works_for", "knows") */
  type: string;
  /** The related entity */
  entity: EntityResponse;
}

/** Base schema for entity without relatedEntities (used to avoid circular reference) */
const entityResponseBaseSchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string()
});

/** Schema for related entity response from external API */
export const relatedEntityResponseSchema: z.ZodType<RelatedEntityResponse> = z.object({
  type: z.string(),
  entity: z.lazy(() => entityResponseSchema)
});

/** Schema for entity response from external API */
export const entityResponseSchema: z.ZodType<EntityResponse> = entityResponseBaseSchema.extend({
  relatedEntities: z.lazy(() => relatedEntityResponseSchema.array()).optional()
});
