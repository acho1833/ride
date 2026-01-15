import { Entity } from '@/models/entity.model';
import { EntityResponse } from '@/models/entity-response.model';

/**
 * Parameters for searching entities.
 * - name: Search string (case-sensitive contains match)
 * - types: Optional array of entity types to filter by (empty = all types)
 * - sortDirection: Sort order for labelNormalized ('asc' or 'desc')
 * - pageSize: Number of results per page
 * - pageNumber: Current page (1-indexed)
 */
export interface EntitySearchParams {
  name: string;
  types?: string[];
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  pageNumber: number;
}

/**
 * Response from entity search - uses our internal Entity model.
 * This is what the service layer returns to the router/hooks.
 */
export interface EntitySearchResponse {
  entities: Entity[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Response from mock external API - uses EntityResponse model.
 * This is what the mock service returns before conversion.
 */
export interface EntitySearchMockResponse {
  entities: EntityResponse[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
