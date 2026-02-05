/** Default page size for pattern search results */
export const DEFAULT_PATTERN_PAGE_SIZE = 50;

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
