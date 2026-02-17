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

/** Map category string to hex color */
export const SPREADLINE_CATEGORY_COLORS: Record<string, string> = {
  internal: SPREADLINE_INTERNAL_COLOR,
  external: SPREADLINE_EXTERNAL_COLOR
} as const;
