/**
 * All Todos Query Hook
 *
 * Fetches all todos with caching via TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching all todos
 * @returns Query result with todos array, loading, and error states
 */
export const useTodosQuery = () => {
  return useQuery(orpc.todo.getAll.queryOptions());
};
