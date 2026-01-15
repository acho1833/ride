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
} & Coordinate;

/** Zod schema for Entity validation in oRPC routes */
export const entitySchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional()
});

/**
 * Converts external API response to Entity model.
 * Note: x/y coordinates are only set internally when entities are positioned in D3 graph,
 * they are never returned from the external API.
 */
export function toEntity(response: { id: string; labelNormalized: string; type: string }): Entity {
  return {
    id: response.id,
    labelNormalized: response.labelNormalized,
    type: response.type
  };
}
