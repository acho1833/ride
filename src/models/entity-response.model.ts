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
}

export const entityResponseSchema = z.object({
  id: z.string(),
  labelNormalized: z.string(),
  type: z.string()
});
