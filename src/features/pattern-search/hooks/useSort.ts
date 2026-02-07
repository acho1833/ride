import { useState, useCallback } from 'react';
import type { SortDirection } from '../types';
import { DEFAULT_SORT_ATTRIBUTE, DEFAULT_SORT_DIRECTION } from '../const';

export interface SortState {
  attribute: string;
  direction: SortDirection;
}

export interface UseSortReturn {
  sortState: SortState;
  setAttribute: (attribute: string) => void;
  toggleDirection: () => void;
}

/**
 * Reusable hook for managing sort state.
 * Provides attribute selection and direction toggle.
 */
export function useSort(
  initialAttribute: string = DEFAULT_SORT_ATTRIBUTE,
  initialDirection: SortDirection = DEFAULT_SORT_DIRECTION
): UseSortReturn {
  const [sortState, setSortState] = useState<SortState>({
    attribute: initialAttribute,
    direction: initialDirection
  });

  const setAttribute = useCallback((attribute: string) => {
    setSortState(prev => ({ ...prev, attribute }));
  }, []);

  const toggleDirection = useCallback(() => {
    setSortState(prev => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  return {
    sortState,
    setAttribute,
    toggleDirection
  };
}
