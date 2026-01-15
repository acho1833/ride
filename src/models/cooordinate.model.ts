/**
 * Coordinate type for optional x/y positioning.
 * Used by Entity model for D3 graph positioning.
 * When present, both x and y are required together.
 */
export type Coordinate =
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty object represents "no coordinates set"
  | {}
  | {
      x: number;
      y: number;
    };
