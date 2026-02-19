/**
 * Spreadline Feature Constants
 */

/** Default ego entity ID for the vis-author dataset (Jeffrey Heer) */
export const SPREADLINE_DEFAULT_EGO_ID = 'p1199';

/** Default relation types to include */
export const SPREADLINE_DEFAULT_RELATION_TYPES = ['Co-co-author'];

/** Default year range [start, end] */
export const SPREADLINE_DEFAULT_YEAR_RANGE: [number, number] = [2002, 2022];

/** Minimum width per timestamp column (px) */
export const SPREADLINE_MIN_WIDTH_PER_TIMESTAMP = 200;

/** Chart height for layout computation (px) */
export const SPREADLINE_CHART_HEIGHT = 1000;

/** Tab ID prefix for spreadline tabs */
export const SPREADLINE_TAB_PREFIX = 'spreadline';

/** Line color for entities sharing affiliation with ego */
export const SPREADLINE_INTERNAL_COLOR = '#FA9902';

/** Line color for entities with different affiliation from ego */
export const SPREADLINE_EXTERNAL_COLOR = '#166b6b';

/** Approximate width of a single character in label text (px) */
export const SPREADLINE_CHAR_WIDTH_PX = 8;

/** Extra padding around labels (px) */
export const SPREADLINE_LABEL_PADDING_PX = 80;

/** Time granularity for x-axis grouping */
export const SPREADLINE_TIME_DELTA = 'year';

/** Date format string for parsing/displaying time */
export const SPREADLINE_TIME_FORMAT = '%Y';

/** Compact same-category lines closer together */
export const SPREADLINE_SQUEEZE_SAME_CATEGORY = true;

/** Layout optimization strategy: 'space' | 'line' | 'wiggles' */
export const SPREADLINE_MINIMIZE: 'space' | 'line' | 'wiggles' = 'wiggles';

/** Map category string to hex color */
export const SPREADLINE_CATEGORY_COLORS: Record<string, string> = {
  internal: SPREADLINE_INTERNAL_COLOR,
  external: SPREADLINE_EXTERNAL_COLOR
} as const;

// ── Time Scrubber Constants ─────────────────────────────────────────

/** Speed options for the time scrubber animation */
export const SCRUBBER_SPEED_OPTIONS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '2x', ms: 500 }
] as const;

/** Default animation interval (ms) */
export const SCRUBBER_DEFAULT_SPEED_MS = 1000;

// ── Hop-Aware Graph Layout Constants ────────────────────────────────

/** Force link distance: ego ↔ hop-1 nodes */
export const GRAPH_HOP1_LINK_DISTANCE = 100;

/** Force link distance: hop-1 ↔ hop-2 nodes */
export const GRAPH_HOP2_LINK_DISTANCE = 200;

/** Radial force target radius for hop-1 nodes */
export const GRAPH_HOP1_RADIAL_RADIUS = 120;

/** Radial force target radius for hop-2 nodes */
export const GRAPH_HOP2_RADIAL_RADIUS = 240;

/** Strength of the radial force nudge (0-1) */
export const GRAPH_RADIAL_STRENGTH = 0.3;

/** D3 transition duration for time-block changes (ms) */
export const GRAPH_TIME_TRANSITION_MS = 600;

// ── Spreadline Highlight Bar ────────────────────────────────────────

/** Fill color for the time highlight bar on the spreadline chart */
export const SPREADLINE_HIGHLIGHT_FILL = 'rgba(59, 130, 246, 0.15)';

/** Border color for the time highlight bar */
export const SPREADLINE_HIGHLIGHT_STROKE = 'rgba(59, 130, 246, 0.5)';
