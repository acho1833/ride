/**
 * Spreadline 2 Feature Constants
 *
 * Single-color design: all non-ego entities use orange (#FA9902).
 * No internal/external distinction.
 */

/** Default ego entity ID for the vis-author dataset (Jeffrey Heer) */
export const SPREADLINE2_DEFAULT_EGO_ID = 'p1199';

/** Default relation types to include */
export const SPREADLINE2_DEFAULT_RELATION_TYPES = ['Co-co-author'];

/** Default year range [start, end] */
export const SPREADLINE2_DEFAULT_YEAR_RANGE: [number, number] = [2002, 2022];

/** Minimum width per timestamp column (px) */
export const SPREADLINE2_MIN_WIDTH_PER_TIMESTAMP = 200;

/** Chart height for layout computation (px) */
export const SPREADLINE2_CHART_HEIGHT = 1000;

/** Tab ID prefix for spreadline2 tabs */
export const SPREADLINE2_TAB_PREFIX = 'spreadline2';

/** Line color for all non-ego entities (single color, no internal/external) */
export const SPREADLINE2_LINE_COLOR = '#FA9902';

/** Approximate width of a single character in label text (px) */
export const SPREADLINE2_CHAR_WIDTH_PX = 8;

/** Extra padding around labels (px) */
export const SPREADLINE2_LABEL_PADDING_PX = 80;

/** Time granularity for x-axis grouping */
export const SPREADLINE2_TIME_DELTA = 'year';

/** Date format string for parsing/displaying time */
export const SPREADLINE2_TIME_FORMAT = '%Y';

/** Compact same-category lines closer together */
export const SPREADLINE2_SQUEEZE_SAME_CATEGORY = true;

/** Layout optimization strategy: 'space' | 'line' | 'wiggles' */
export const SPREADLINE2_MINIMIZE: 'space' | 'line' | 'wiggles' = 'wiggles';

/** Map category string to hex color */
export const SPREADLINE2_CATEGORY_COLORS: Record<string, string> = {
  collaborator: '#FA9902'
} as const;

// ── Time Scrubber Constants ─────────────────────────────────────────

/** Speed options for the time scrubber animation */
export const SCRUBBER2_SPEED_OPTIONS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '2x', ms: 500 }
] as const;

/** Default animation interval (ms) */
export const SCRUBBER2_DEFAULT_SPEED_MS = 1000;

// ── Hop-Aware Graph Layout Constants ────────────────────────────────

/** Force link distance: ego <-> hop-1 nodes */
export const GRAPH2_HOP1_LINK_DISTANCE = 100;

/** Force link distance: hop-1 <-> hop-2 nodes */
export const GRAPH2_HOP2_LINK_DISTANCE = 200;

/** Radial force target radius for hop-1 nodes */
export const GRAPH2_HOP1_RADIAL_RADIUS = 120;

/** Radial force target radius for hop-2 nodes */
export const GRAPH2_HOP2_RADIAL_RADIUS = 240;

/** Strength of the radial force nudge (0-1) */
export const GRAPH2_RADIAL_STRENGTH = 0.3;

/** D3 transition duration for time-block changes (ms) */
export const GRAPH2_TIME_TRANSITION_MS = 600;

// ── Spreadline 2 Highlight Bar ──────────────────────────────────────

/** Fill color for the time highlight bar on the spreadline chart */
export const SPREADLINE2_HIGHLIGHT_FILL = 'rgba(59, 130, 246, 0.15)';

/** Border color for the time highlight bar */
export const SPREADLINE2_HIGHLIGHT_STROKE = 'rgba(59, 130, 246, 0.5)';

/** Width of draggable handles on the highlight bar (px) */
export const SPREADLINE2_HIGHLIGHT_HANDLE_WIDTH = 8;

/** Fill color for highlight bar drag handles */
export const SPREADLINE2_HIGHLIGHT_HANDLE_COLOR = 'rgba(59, 130, 246, 0.4)';

/** Fill color for highlight bar drag handles on hover */
export const SPREADLINE2_HIGHLIGHT_HANDLE_HOVER_COLOR = 'rgba(59, 130, 246, 0.7)';
