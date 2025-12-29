// src/features/editor/const.ts

/**
 * Editor configuration constants
 */
export const EDITOR_CONFIG: {
  /** Max vertical rows (2 = top/bottom only, -1 = unlimited) */
  yGroupLimit: number;
  /** Max horizontal groups per row (-1 = unlimited) */
  xGroupLimit: number;
} = {
  yGroupLimit: 2,
  xGroupLimit: -1
};

/** Drop zone identifiers */
export const DROP_ZONES = {
  CENTER: 'center',
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom'
} as const;

export type DropZone = (typeof DROP_ZONES)[keyof typeof DROP_ZONES];

/** Direction for moving files */
export type MoveDirection = 'left' | 'right' | 'up' | 'down';
