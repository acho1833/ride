/**
 * Todo Feature Constants
 */

/** Route paths for todo feature */
export const ROUTES = {
  TODOS: '/todos',
  TODO: (id: string) => `/todos/${id}`
} as const;
