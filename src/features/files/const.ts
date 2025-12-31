// src/features/files/const.ts

/** Configuration for file tree drag and drop */
export const FILE_DND_CONFIG = {
  /** Delay before auto-expanding a collapsed folder on hover (ms) */
  AUTO_EXPAND_DELAY_MS: 700,
  /** Distance from viewport edge to trigger auto-scroll (px) */
  SCROLL_ZONE_SIZE_PX: 40,
  /** Minimum scroll speed (px per frame) */
  SCROLL_SPEED_MIN: 2,
  /** Maximum scroll speed (px per frame) */
  SCROLL_SPEED_MAX: 15,
  /** Minimum distance to activate drag (px) */
  DRAG_ACTIVATION_DISTANCE: 8
} as const;
