/**
 * Pattern Search Utilities
 *
 * Helper functions for pattern validation and data conversion.
 */

import type { PatternNode, PatternEdge, PatternMatch } from './types';
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';

// ============================================================================
// Pattern Completeness Checks
// ============================================================================

/**
 * Check if all nodes are connected (single graph, no orphans).
 * Uses Union-Find algorithm for efficiency.
 *
 * @param nodes - Pattern nodes to check
 * @param edges - Pattern edges connecting the nodes
 * @returns true if all nodes form a single connected graph
 */
export function areAllNodesConnected(nodes: PatternNode[], edges: PatternEdge[]): boolean {
  if (nodes.length === 0) return false;
  if (nodes.length === 1) return true;

  // Union-Find data structure
  const parent: Record<string, string> = {};

  const find = (id: string): string => {
    if (!parent[id]) parent[id] = id;
    if (parent[id] !== id) parent[id] = find(parent[id]);
    return parent[id];
  };

  const union = (a: string, b: string) => {
    parent[find(a)] = find(b);
  };

  // Initialize each node as its own parent
  nodes.forEach(n => {
    parent[n.id] = n.id;
  });

  // Union nodes connected by edges
  edges.forEach(e => {
    union(e.sourceNodeId, e.targetNodeId);
  });

  // Check if all nodes have the same root
  const roots = new Set(nodes.map(n => find(n.id)));
  return roots.size === 1;
}

/**
 * Check if at least one node has a filter (type or non-empty attribute pattern).
 * A pattern without any filters would match everything.
 * Empty filter patterns (from typing in progress) don't count.
 *
 * @param nodes - Pattern nodes to check
 * @returns true if at least one node has a type or non-empty attribute filter
 */
export function hasAtLeastOneFilter(nodes: PatternNode[]): boolean {
  return nodes.some(node => {
    // Type filter counts
    if (node.type !== null) return true;
    // Check for at least one non-empty pattern in any filter
    return node.filters.some(filter => filter.patterns.some(pattern => pattern.trim().length > 0));
  });
}

/**
 * Check if pattern is complete (ready for preview).
 * Complete means: all nodes connected + at least one filter.
 *
 * @param nodes - Pattern nodes
 * @param edges - Pattern edges
 * @returns true if pattern is ready for search
 */
export function isPatternComplete(nodes: PatternNode[], edges: PatternEdge[]): boolean {
  if (nodes.length === 0) return false;
  return areAllNodesConnected(nodes, edges) && hasAtLeastOneFilter(nodes);
}

/**
 * Get reason why pattern is incomplete (for user message).
 * Returns null if pattern is complete.
 *
 * @param nodes - Pattern nodes
 * @param edges - Pattern edges
 * @returns User-friendly message or null if complete
 */
export function getPatternIncompleteReason(nodes: PatternNode[], edges: PatternEdge[]): string | null {
  if (nodes.length === 0) return null;
  if (!areAllNodesConnected(nodes, edges)) return 'Connect all nodes to see preview';
  if (!hasAtLeastOneFilter(nodes)) return 'Add a filter to see preview';
  return null;
}

// ============================================================================
// Data Conversion
// ============================================================================

/**
 * Convert pattern matches to workspace data format.
 * Deduplicates entities and relationships across all matches.
 *
 * @param matches - Pattern matches from search results
 * @returns Deduplicated entities and relationships for workspace
 */
export function convertMatchesToWorkspaceData(matches: PatternMatch[]): {
  entities: Entity[];
  relationships: Relationship[];
} {
  const entityMap = new Map<string, Entity>();
  const relationshipMap = new Map<string, Relationship>();

  for (const match of matches) {
    // Add entities (dedupe by id)
    for (const entity of match.entities) {
      if (!entityMap.has(entity.id)) {
        entityMap.set(entity.id, entity);
      }
    }
    // Add relationships (dedupe by relationshipId)
    for (const rel of match.relationships) {
      if (!relationshipMap.has(rel.relationshipId)) {
        relationshipMap.set(rel.relationshipId, rel);
      }
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relationships: Array.from(relationshipMap.values())
  };
}
