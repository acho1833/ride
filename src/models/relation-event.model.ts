import { z } from 'zod';

export interface RelationEvent {
  id: string;
  year: string;
  sourceId: string;
  targetId: string;
  type: string;
  citationCount: number;
}

export const relationEventSchema = z.object({
  id: z.string(),
  year: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string(),
  citationCount: z.number()
});
