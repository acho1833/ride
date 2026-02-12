import 'server-only';

import type { PatternSearchParams, PatternSearchResponse } from '../../types';
import * as mockService from './pattern-mock.service';

/**
 * Search for pattern matches in the entity graph.
 * This service layer acts as the boundary between external API and our app.
 */
export async function searchPattern(params: PatternSearchParams): Promise<PatternSearchResponse> {
  return mockService.searchPattern(params);
}

/**
 * Get available relationship predicates for the edge filter UI.
 */
export async function getPredicates(): Promise<string[]> {
  return mockService.getPredicates();
}
