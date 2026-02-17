import { z } from 'zod';
import { entityResponseSchema, type EntityResponse } from './entity-response.model';

/**
 * Relationship from external API.
 */
export interface RelationshipResponse {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}

export const relationshipResponseSchema = z.object({
  relationshipId: z.string(),
  predicate: z.string(),
  sourceEntityId: z.string(),
  relatedEntityId: z.string()
});

/**
 * Workspace response from external API.
 * Does not include viewPreference - that's stored in our DB.
 */
export interface WorkspaceResponse {
  id: string;
  name: string;
  entityList: EntityResponse[];
  relationshipList: RelationshipResponse[];
}

export const workspaceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  entityList: entityResponseSchema.array(),
  relationshipList: relationshipResponseSchema.array()
});
