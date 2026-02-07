import 'server-only';

import { getMockEntities, getMockRelationships } from '@/lib/mock-data';
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';
import type { PatternSearchParams, PatternSearchResponse, PatternMatch, PatternNode, PatternEdge } from '../../types';

/**
 * Convert a glob-style pattern to regex.
 * Supports: * (any chars), ? (single char), literal text.
 * Example: "A*" → "^A.*$", "Jo?n" → "^Jo.n$"
 */
function globToRegex(pattern: string): string {
  // Escape regex special chars except * and ?
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Convert glob wildcards to regex
  const regexPattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  // Anchor to match full string
  return `^${regexPattern}$`;
}

/**
 * Check if a value matches any of the patterns (OR logic).
 * Patterns use glob-style matching: * for any chars, ? for single char.
 * Empty patterns are skipped.
 */
function matchesPatterns(value: string | undefined, patterns: string[]): boolean {
  // Filter out empty patterns
  const nonEmptyPatterns = patterns.filter(p => p.trim().length > 0);

  if (!value) return nonEmptyPatterns.length === 0;
  if (nonEmptyPatterns.length === 0) return true;

  return nonEmptyPatterns.some(pattern => {
    try {
      const regex = new RegExp(globToRegex(pattern.trim()), 'i');
      return regex.test(value);
    } catch {
      // Invalid pattern - treat as literal substring match
      return value.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

/**
 * Check if an entity matches a pattern node's constraints.
 * - Type filter: null means any type
 * - Attribute filters: AND logic between filters, OR logic within each filter's patterns
 */
function entityMatchesNode(entity: Entity, node: PatternNode): boolean {
  // Check type filter
  if (node.type !== null && entity.type !== node.type) {
    return false;
  }

  // Check attribute filters (AND logic - all filters must pass)
  for (const filter of node.filters) {
    // Get attribute value from entity
    const value = (entity as Record<string, unknown>)[filter.attribute] as string | undefined;

    // Check if value matches any pattern (OR logic within filter)
    if (!matchesPatterns(value, filter.patterns)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a relationship matches a pattern edge's constraints.
 * - Predicates: empty array means any predicate, otherwise OR logic
 * - Matches both directions (source→target or target→source)
 */
function relationshipMatchesEdge(
  relationship: Relationship,
  edge: PatternEdge,
  sourceEntityId: string,
  targetEntityId: string
): { matches: boolean; direction: 'forward' | 'reverse' } {
  // Check if relationship connects the two entities (either direction)
  const isForward = relationship.sourceEntityId === sourceEntityId && relationship.relatedEntityId === targetEntityId;
  const isReverse = relationship.sourceEntityId === targetEntityId && relationship.relatedEntityId === sourceEntityId;

  if (!isForward && !isReverse) {
    return { matches: false, direction: 'forward' };
  }

  // Check predicate filter (OR logic)
  if (edge.predicates.length > 0 && !edge.predicates.includes(relationship.predicate)) {
    return { matches: false, direction: 'forward' };
  }

  return { matches: true, direction: isForward ? 'forward' : 'reverse' };
}

/**
 * Find all entity combinations that match the pattern nodes.
 * Uses recursive backtracking to find valid assignments.
 */
function findMatchingEntitySets(
  nodes: PatternNode[],
  edges: PatternEdge[],
  entities: Entity[],
  relationships: Relationship[]
): Array<{ entities: Map<string, Entity>; relationships: Relationship[] }> {
  const results: Array<{ entities: Map<string, Entity>; relationships: Relationship[] }> = [];

  // Sort nodes alphabetically by label for consistent ordering
  const sortedNodes = [...nodes].sort((a, b) => a.label.localeCompare(b.label));

  /**
   * Recursive function to assign entities to pattern nodes.
   * @param nodeIndex - Current node index to assign
   * @param assignment - Current entity assignments (nodeId → Entity)
   * @param usedEntityIds - Set of already-used entity IDs (no duplicates)
   * @param matchedRelationships - Relationships that matched edges so far
   */
  function backtrack(
    nodeIndex: number,
    assignment: Map<string, Entity>,
    usedEntityIds: Set<string>,
    matchedRelationships: Relationship[]
  ): void {
    // Base case: all nodes assigned
    if (nodeIndex === sortedNodes.length) {
      results.push({
        entities: new Map(assignment),
        relationships: [...matchedRelationships]
      });
      return;
    }

    const currentNode = sortedNodes[nodeIndex];

    // Try each entity for this node
    for (const entity of entities) {
      // Skip if entity already used
      if (usedEntityIds.has(entity.id)) continue;

      // Check if entity matches node constraints
      if (!entityMatchesNode(entity, currentNode)) continue;

      // Check if all edges to already-assigned nodes are satisfied
      const edgesToCheck = edges.filter(
        e =>
          (e.sourceNodeId === currentNode.id && assignment.has(e.targetNodeId)) ||
          (e.targetNodeId === currentNode.id && assignment.has(e.sourceNodeId))
      );

      let allEdgesSatisfied = true;
      const newMatchedRelationships: Relationship[] = [];

      for (const edge of edgesToCheck) {
        const otherNodeId = edge.sourceNodeId === currentNode.id ? edge.targetNodeId : edge.sourceNodeId;
        const otherEntity = assignment.get(otherNodeId)!;

        // Find a relationship that satisfies this edge
        let foundMatch = false;
        for (const rel of relationships) {
          const { matches } = relationshipMatchesEdge(rel, edge, entity.id, otherEntity.id);
          if (matches) {
            newMatchedRelationships.push(rel);
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          allEdgesSatisfied = false;
          break;
        }
      }

      if (!allEdgesSatisfied) continue;

      // Assign entity and recurse
      assignment.set(currentNode.id, entity);
      usedEntityIds.add(entity.id);

      backtrack(nodeIndex + 1, assignment, usedEntityIds, [...matchedRelationships, ...newMatchedRelationships]);

      // Backtrack
      assignment.delete(currentNode.id);
      usedEntityIds.delete(entity.id);
    }
  }

  backtrack(0, new Map(), new Set(), []);

  return results;
}

/**
 * Sort matches by first entity's labelNormalized (case-insensitive).
 */
function sortMatches(matches: PatternMatch[], sortAttribute: string, sortDirection: 'asc' | 'desc'): PatternMatch[] {
  if (sortAttribute !== 'label') return matches;

  return [...matches].sort((a, b) => {
    const labelA = (a.entities[0]?.labelNormalized ?? '').toLowerCase();
    const labelB = (b.entities[0]?.labelNormalized ?? '').toLowerCase();
    const comparison = labelA.localeCompare(labelB);
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

/**
 * Search for pattern matches in the entity graph.
 * Returns paginated results with entities ordered alphabetically by node label.
 */
export async function searchPattern(params: PatternSearchParams): Promise<PatternSearchResponse> {
  const { pattern, pageSize, pageNumber, sortAttribute = 'label', sortDirection = 'asc' } = params;

  // Handle empty pattern
  if (pattern.nodes.length === 0) {
    return { matches: [], totalCount: 0, pageNumber, pageSize };
  }

  const entities = getMockEntities().map(e => ({
    id: e.id,
    labelNormalized: e.labelNormalized,
    type: e.type
  }));

  const relationships = getMockRelationships().map(r => ({
    relationshipId: r.relationshipId,
    predicate: r.predicate,
    sourceEntityId: r.sourceEntityId,
    relatedEntityId: r.relatedEntityId
  }));

  // Find all matching entity sets
  const rawMatches = findMatchingEntitySets(pattern.nodes, pattern.edges, entities, relationships);

  // Convert to PatternMatch format (entities ordered by node label)
  const sortedNodes = [...pattern.nodes].sort((a, b) => a.label.localeCompare(b.label));
  const matches: PatternMatch[] = rawMatches.map(match => ({
    entities: sortedNodes.map(node => match.entities.get(node.id)!),
    relationships: match.relationships
  }));

  // Sort matches before pagination
  const sortedMatches = sortMatches(matches, sortAttribute, sortDirection);

  // Apply pagination
  const totalCount = sortedMatches.length;
  const startIndex = (pageNumber - 1) * pageSize;
  const pagedMatches = sortedMatches.slice(startIndex, startIndex + pageSize);

  return {
    matches: pagedMatches,
    totalCount,
    pageNumber,
    pageSize
  };
}

/**
 * Get available relationship predicates for the edge filter UI.
 */
export async function getPredicates(): Promise<string[]> {
  const relationships = getMockRelationships();
  const predicates = new Set(relationships.map(r => r.predicate));
  return Array.from(predicates).sort();
}
