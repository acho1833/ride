/** Default page size for pattern search results */
export const DEFAULT_PATTERN_PAGE_SIZE = 50;

/** Debounce delay for auto-search when pattern changes (ms) */
export const SEARCH_DEBOUNCE_MS = 500;

/** Default filename for workspace created from search results */
export const DEFAULT_SEARCH_RESULTS_FILENAME = 'search-results';

/** Minimum width class for advanced search mode (Tailwind class) */
export const ADVANCED_SEARCH_MIN_WIDTH = 'min-w-[600px]';

/** Node label prefix for auto-generated labels */
export const NODE_LABEL_PREFIX = 'Node';

/** Default position offset when adding new nodes */
export const NEW_NODE_OFFSET = { x: 200, y: 100 };

/** Initial position for first node */
export const INITIAL_NODE_POSITION = { x: 100, y: 150 };

/** Pattern builder dimensions */
export const PATTERN_BUILDER = {
  /** Minimum height for the canvas */
  MIN_HEIGHT: 200,
  /** Config panel width */
  CONFIG_PANEL_WIDTH: 200
} as const;

/**
 * Available entity attributes for filtering.
 * Each attribute has a key (for API) and label (for UI display).
 */
export const ENTITY_ATTRIBUTES = [
  { key: 'labelNormalized', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' }
] as const;

/** Type for entity attribute keys */
export type EntityAttributeKey = (typeof ENTITY_ATTRIBUTES)[number]['key'];

/**
 * Available sort attributes for pattern search results.
 * Each attribute has a value (for API) and label (for UI display).
 */
export const SORT_ATTRIBUTES = [{ value: 'label', label: 'Label' }] as const;

/** Default sort attribute */
export const DEFAULT_SORT_ATTRIBUTE = 'label';

/** Default sort direction */
export const DEFAULT_SORT_DIRECTION = 'asc' as const;

/** Maximum results to compute before short-circuiting (keeps queries fast for high-connectivity patterns) */
export const RESULT_COUNT_CAP = 2000;
