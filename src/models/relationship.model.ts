import { z } from 'zod';

export interface Relationship {
  relationshipId: string;
  predicate: string;
  sourceEntityId: string;
  relatedEntityId: string;
}

export const relationshipSchema = z.object({
  relationshipId: z.string(),
  predicate: z.string(),
  sourceEntityId: z.string(),
  relatedEntityId: z.string()
});