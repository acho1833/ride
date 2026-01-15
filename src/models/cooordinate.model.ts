/**
 * Coordinate type for optional x/y positioning.
 * Used by Entity model for D3 graph positioning.
 * When present, both x and y are required together.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Coordinate = {} | {
  x: number;
  y: number;
};