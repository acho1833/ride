import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Query hook for fetching available relationship predicates.
 * Used to populate the edge predicate filter checkboxes.
 */
export const usePredicatesQuery = () => {
  return useQuery(orpc.pattern.getPredicates.queryOptions());
};
