/** Default page size for entity search results */
export const DEFAULT_PAGE_SIZE = 50;

/** Default sort direction for entity search results */
export const DEFAULT_SORT_DIRECTION = 'asc' as const;

/** Entity API endpoint paths (relative to ENTITY_API_BASE) */
export const ENTITY_ENDPOINTS = {
  SEARCH: '/entities/search',
  TYPES: '/entities/types',
  GET_BY_ID: (id: string) => `/entities/${id}`
} as const;
