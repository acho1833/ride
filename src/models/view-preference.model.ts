import { z } from 'zod';
import { coordinateSchema, type Coordinate } from './cooordinate.model';

export interface ViewPreference {
  scale: number;
  coordinate: Coordinate;
}

export const viewPreferenceSchema = z.object({
  scale: z.number(),
  coordinate: coordinateSchema
});