import { Entity } from '@/models/entity.model';
import { Relationship } from '@/models/relationship.model';

/**
 * Attribute filter - a single filter condition on an entity attribute.
 * Multiple patterns use OR logic (matches if any pattern matches).
 */
export interface AttributeFilter {
  /** Attribute name to filter on (e.g., "labelNormalized", "email") */
  attribute: string;
  /** Regex patterns (OR logic - matches if any pattern matches) */
  patterns: string[];
}

/**
 * Pattern node - represents a constraint on an entity in the search pattern.
 * Users configure type and attribute filters; matches use AND between filters, OR within patterns.
 */
export interface PatternNode {
  /** Unique identifier for this node */
  id: string;
  /** Display label in the pattern builder (e.g., "Node A") */
  label: string;
  /** Entity type filter (null = any type) */
  type: string | null;
  /** Attribute filters (AND logic between filters, OR logic within each filter's patterns) */
  filters: AttributeFilter[];
  /** Position in React Flow canvas */
  position: { x: number; y: number };
}

/**
 * Pattern edge - represents a constraint on a relationship in the search pattern.
 * Empty predicates array means "match any predicate".
 */
export interface PatternEdge {
  /** Unique identifier for this edge */
  id: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** Allowed predicates (OR logic - empty = any predicate) */
  predicates: string[];
}

/**
 * Complete search pattern definition.
 * Sent to the server for pattern matching.
 */
export interface SearchPattern {
  nodes: PatternNode[];
  edges: PatternEdge[];
}

/**
 * Search input parameters for pattern search API.
 */
export interface PatternSearchParams {
  pattern: SearchPattern;
  pageSize: number;
  pageNumber: number;
}

/**
 * Single match result - entities ordered alphabetically by node label.
 * Relationships show the actual matched connections with correct direction.
 */
export interface PatternMatch {
  /** Matched entities, ordered alphabetically by their pattern node label */
  entities: Entity[];
  /** Actual relationships that matched, showing true direction */
  relationships: Relationship[];
}

/**
 * Pattern search response - follows existing pagination pattern.
 */
export interface PatternSearchResponse {
  matches: PatternMatch[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Search mode for entity search panel.
 */
export type SearchMode = 'simple' | 'advanced';
