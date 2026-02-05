import { z } from 'zod';
import { Coordinate } from './cooordinate.model';

/**
 * Entity represents a node in the graph (Person, Organization, etc.).
 * Extends Coordinate for optional x/y positioning when displayed in D3 graph.
 */
export type Entity = {
  id: string;
  labelNormalized: string;
  type: string;
  /**
   * Related entities map - only populated when fetching single entity details.
   * Key is the grouping field (entity type or predicate), value is array of related entities.
   */
  relatedEntities?: Record<string, RelatedEntity[]>;
} & Coordinate;

/**
 * RelatedEntity extends Entity with the relationship predicate.
 * Used in relatedEntities map to show how entities are connected.
 */
export interface RelatedEntity extends Omit<Entity, 'relatedEntities'> {
  /** The predicate describing the relationship (e.g., "works_for", "knows") */
  predicate: string;
}

/** Base entity schema for core fields (used for recursive/nested definitions) */
const entitySchemaBase = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional()
});

/** Schema for related entities - extends base with predicate field */
export const relatedEntitySchema = entitySchemaBase.extend({
  predicate: z.string()
});

/** Zod schema for Entity validation in oRPC routes */
export const entitySchema = entitySchemaBase.extend({
  relatedEntities: z.record(z.string(), relatedEntitySchema.array()).optional()
});

/**
 * Converts external API response to Entity model (without relatedEntities).
 * Used for search results and workspace entity lists.
 * Note: x/y coordinates are only set internally when entities are positioned in D3 graph,
 * they are never returned from the external API.
 */
export function toEntity(response: {
  id: string;
  labelNormalized: string;
  type: string;
}): Entity {
  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type
  };
}
