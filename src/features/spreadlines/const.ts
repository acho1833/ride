/**
 * Spreadline Feature Constants
 */

/** Default ego entity ID for the vis-author dataset (Jeffrey Heer) */
export const SPREADLINE_DEFAULT_EGO_ID = 'p1199';

/** Available relation types for the dropdown */
export const SPREADLINE_RELATION_TYPE_OPTIONS = ['Co-co-author'] as const;

/** Default relation types to include */
export const SPREADLINE_DEFAULT_RELATION_TYPES: string[] = [SPREADLINE_RELATION_TYPE_OPTIONS[0]];

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

/** Color for entities selected/pinned via spreadline (violet) */
export const SPREADLINE_SELECTED_COLOR = 'hsl(270, 65%, 55%)';

/** Approximate width of a single character in label text (px) */
export const SPREADLINE_CHAR_WIDTH_PX = 8;

/** Extra padding around labels (px) */
export const SPREADLINE_LABEL_PADDING_PX = 80;

/** Time granularity for x-axis grouping */
export const SPREADLINE_TIME_DELTA = 'year';

/** Date format string for parsing/displaying time */
export const SPREADLINE_TIME_FORMAT = '%Y';

/** Granularity type for time axis */
export type SpreadlineGranularity = 'yearly' | 'monthly';

/** Available granularity options for the dropdown */
export const SPREADLINE_GRANULARITY_OPTIONS: { label: string; value: SpreadlineGranularity }[] = [
  { label: 'Yearly', value: 'yearly' },
  { label: 'Monthly', value: 'monthly' }
];

/** Default granularity */
export const SPREADLINE_DEFAULT_GRANULARITY: SpreadlineGranularity = 'yearly';

/** Default split by affiliation (internal/external distinction) */
export const SPREADLINE_DEFAULT_SPLIT_BY_AFFILIATION = true;

/** Number of blocks per page for pagination */
export const SPREADLINE_PAGE_SIZE = 20;

/** Time config per granularity */
export const SPREADLINE_TIME_CONFIG: Record<SpreadlineGranularity, { delta: string; format: string }> = {
  yearly: { delta: 'year', format: '%Y' },
  monthly: { delta: 'month', format: '%Y-%m' }
};

/** Maximum characters for entity name labels before truncation */
export const SPREADLINE_LABEL_MAX_CHARS = 12;

/** Compact same-category lines closer together */
export const SPREADLINE_SQUEEZE_SAME_CATEGORY = true;

/** Layout optimization strategy: 'space' | 'line' | 'wiggles' */
export const SPREADLINE_MINIMIZE: 'space' | 'line' | 'wiggles' = 'wiggles';

/** Map category string to hex color */
export const SPREADLINE_CATEGORY_COLORS: Record<string, string> = {
  internal: SPREADLINE_INTERNAL_COLOR,
  external: SPREADLINE_EXTERNAL_COLOR
} as const;

/** Frequency heatmap colors (low → high) matching the D3 threshold scale */
export const SPREADLINE_FREQUENCY_COLORS = ['#ffffff', '#fcdaca', '#e599a6', '#c94b77', '#740980'];

/** Frequency heatmap thresholds (boundaries between color bands) */
export const SPREADLINE_FREQUENCY_THRESHOLDS = [10, 50, 100, 500];

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

/** Graph link thresholds (lower than heatmap to match typical graph weights) */
export const GRAPH_LINK_THRESHOLDS = [2, 4, 6, 10];

/** Fixed link stroke widths per citation-count band (doubled for visibility) */
export const GRAPH_LINK_WIDTH_BANDS = [2, 4, 6, 8, 12];

/** Link colors for graph (visible on dark background) */
export const GRAPH_LINK_COLORS = ['#d4b896', '#fcdaca', '#e599a6', '#c94b77', '#740980'];

// ── Spreadline Block Padding ────────────────────────────────────────

/** Extra top padding above the first node in each block column (px).
 *  Creates a larger clickable area between the year label and the pills. */
export const SPREADLINE_BLOCK_TOP_PADDING = 60;

/** Bottom padding below the last node in each block column (px) */
export const SPREADLINE_BLOCK_BOTTOM_PADDING = 20;

// ── Spreadline Highlight Bar ────────────────────────────────────────

/** Fill color for the time highlight bar on the spreadline chart */
export const SPREADLINE_HIGHLIGHT_FILL = 'rgba(59, 130, 246, 0.15)';

/** Border color for the time highlight bar */
export const SPREADLINE_HIGHLIGHT_STROKE = 'rgba(59, 130, 246, 0.5)';

/** Width of draggable handles on the highlight bar (px) */
export const SPREADLINE_HIGHLIGHT_HANDLE_WIDTH = 8;

/** Fill color for highlight bar drag handles */
export const SPREADLINE_HIGHLIGHT_HANDLE_COLOR = 'rgba(59, 130, 246, 0.4)';

/** Fill color for highlight bar drag handles on hover */
export const SPREADLINE_HIGHLIGHT_HANDLE_HOVER_COLOR = 'rgba(59, 130, 246, 0.7)';

// ── Network Timeline Constants ────────────────────────────────────

/** Bottom tab type for switching between spreadline and network timeline */
export type SpreadlineBottomTab = 'spreadline' | 'network-timeline';

/** Height of each entity row in the network timeline chart (px) */
export const NETWORK_TIMELINE_ROW_HEIGHT = 32;

/** Radius of dots at each time block (px) */
export const NETWORK_TIMELINE_DOT_RADIUS = 5;

/** Stroke width of lines connecting consecutive time blocks (px) */
export const NETWORK_TIMELINE_LINE_WIDTH = 3;

/** Width of the entity name label column (px) */
export const NETWORK_TIMELINE_LABEL_WIDTH = 120;

/** Padding around the chart area */
export const NETWORK_TIMELINE_PADDING = { top: 30, right: 20, bottom: 10, left: 130 };
