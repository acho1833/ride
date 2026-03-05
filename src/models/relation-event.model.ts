import { z } from 'zod';

export interface RelationEvent {
  id: string;
  year: string;
  sourceId: string;
  targetId: string;
  type: string;
  relationshipCount: number;
}

export const relationEventSchema = z.object({
  id: z.string(),
  year: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string(),
  relationshipCount: z.number()
});
