/**
 * Single Todo Query Hook
 *
 * Fetches a single todo by ID with caching via TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Hook for fetching a single todo by ID
 * @param id - The todo ID to fetch
 * @returns Query result with todo data, loading, and error states
 */
export const useTodoQuery = (id: string) => {
  return useQuery(
    orpc.todo.getById.queryOptions({
      input: { id }
    })
  );
};
