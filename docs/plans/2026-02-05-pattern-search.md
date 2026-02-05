# Graph Pattern Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add advanced graph pattern search to Entity Search panel, allowing users to visually build query patterns with React Flow and find matching subgraphs in the data.

**Architecture:** Extend existing Entity Search with a toggle between Simple/Advanced modes. Advanced mode expands the panel width and shows a React Flow canvas for pattern building. Pattern matching executes server-side against mock data, returning flattened linear chain results.

**Tech Stack:** React Flow (`@xyflow/react`), Zustand (pattern state), ORPC (search endpoint), existing Entity/Relationship models.

---

## Task 1: Install React Flow

**Files:**
- Modify: `package.json`

**Step 1: Install @xyflow/react**

Run:
```bash
npm install @xyflow/react
```

**Step 2: Verify installation**

Run: `npm ls @xyflow/react`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react for pattern search"
```

---

## Task 2: Create Pattern Search Types

**Files:**
- Create: `src/features/pattern-search/types.ts`

**Step 1: Create types file**

```typescript
// src/features/pattern-search/types.ts

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
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/types.ts
git commit -m "feat(pattern-search): add type definitions"
```

---

## Task 3: Create Pattern Search Constants

**Files:**
- Create: `src/features/pattern-search/const.ts`

**Step 1: Create constants file**

```typescript
// src/features/pattern-search/const.ts

/** Default page size for pattern search results */
export const DEFAULT_PATTERN_PAGE_SIZE = 20;

/** Node label prefix for auto-generated labels */
export const NODE_LABEL_PREFIX = 'Node';

/** Default position offset when adding new nodes */
export const NEW_NODE_OFFSET = { x: 200, y: 100 };

/** Initial position for first node */
export const INITIAL_NODE_POSITION = { x: 100, y: 150 };

/** Pattern builder dimensions */
export const PATTERN_BUILDER = {
  /** Minimum height for the canvas */
  MIN_HEIGHT: 200,
  /** Config panel width */
  CONFIG_PANEL_WIDTH: 200
} as const;

/**
 * Available entity attributes for filtering.
 * Each attribute has a key (for API) and label (for UI display).
 */
export const ENTITY_ATTRIBUTES = [
  { key: 'labelNormalized', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' }
] as const;

/** Type for entity attribute keys */
export type EntityAttributeKey = (typeof ENTITY_ATTRIBUTES)[number]['key'];
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/const.ts
git commit -m "feat(pattern-search): add constants"
```

---

## Task 4: Create Pattern Store Slice

**Files:**
- Create: `src/stores/pattern-search/pattern-search.store.ts`
- Create: `src/stores/pattern-search/pattern-search.selector.ts`
- Modify: `src/stores/app.store.ts`

**Step 1: Create store slice**

```typescript
// src/stores/pattern-search/pattern-search.store.ts

/**
 * Pattern Search Store Slice
 *
 * Manages the state of the pattern builder including nodes, edges, and selection.
 */

import { StateCreator } from 'zustand';
import type { PatternNode, PatternEdge, SearchMode, AttributeFilter } from '@/features/pattern-search/types';
import { NODE_LABEL_PREFIX, INITIAL_NODE_POSITION, NEW_NODE_OFFSET } from '@/features/pattern-search/const';

/** Pattern search state interface */
export interface PatternSearchState {
  patternSearch: {
    /** Current search mode */
    mode: SearchMode;
    /** Pattern nodes */
    nodes: PatternNode[];
    /** Pattern edges */
    edges: PatternEdge[];
    /** Currently selected node ID (null if none) */
    selectedNodeId: string | null;
    /** Currently selected edge ID (null if none) */
    selectedEdgeId: string | null;
  };
}

/** Pattern search actions interface */
export interface PatternSearchActions {
  /** Set search mode (simple/advanced) */
  setSearchMode: (mode: SearchMode) => void;
  /** Add a new node to the pattern */
  addNode: () => void;
  /** Update an existing node */
  updateNode: (id: string, updates: Partial<Omit<PatternNode, 'id'>>) => void;
  /** Delete a node and its connected edges */
  deleteNode: (id: string) => void;
  /** Add a filter to a node */
  addNodeFilter: (nodeId: string, filter: AttributeFilter) => void;
  /** Update a filter on a node */
  updateNodeFilter: (nodeId: string, filterIndex: number, updates: Partial<AttributeFilter>) => void;
  /** Remove a filter from a node */
  removeNodeFilter: (nodeId: string, filterIndex: number) => void;
  /** Add a new edge between nodes */
  addEdge: (sourceNodeId: string, targetNodeId: string) => void;
  /** Update an existing edge */
  updateEdge: (id: string, updates: Partial<Omit<PatternEdge, 'id'>>) => void;
  /** Delete an edge */
  deleteEdge: (id: string) => void;
  /** Select a node (clears edge selection) */
  selectNode: (id: string | null) => void;
  /** Select an edge (clears node selection) */
  selectEdge: (id: string | null) => void;
  /** Clear the entire pattern */
  clearPattern: () => void;
}

/** Combined slice type */
export type PatternSearchSlice = PatternSearchState & PatternSearchActions;

/** Generate next node label (Node A, Node B, etc.) */
function getNextNodeLabel(nodes: PatternNode[]): string {
  const usedLabels = new Set(nodes.map(n => n.label));
  let charCode = 65; // 'A'
  while (usedLabels.has(`${NODE_LABEL_PREFIX} ${String.fromCharCode(charCode)}`)) {
    charCode++;
  }
  return `${NODE_LABEL_PREFIX} ${String.fromCharCode(charCode)}`;
}

/** Calculate position for new node */
function getNextNodePosition(nodes: PatternNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return INITIAL_NODE_POSITION;
  }
  const lastNode = nodes[nodes.length - 1];
  return {
    x: lastNode.position.x + NEW_NODE_OFFSET.x,
    y: lastNode.position.y
  };
}

/** Creates the pattern search slice */
export const createPatternSearchSlice: StateCreator<PatternSearchSlice, [], [], PatternSearchSlice> = set => ({
  patternSearch: {
    mode: 'simple',
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null
  },

  setSearchMode: mode =>
    set(state => ({
      patternSearch: { ...state.patternSearch, mode }
    })),

  addNode: () =>
    set(state => {
      const newNode: PatternNode = {
        id: `node-${Date.now()}`,
        label: getNextNodeLabel(state.patternSearch.nodes),
        type: null,
        filters: [],
        position: getNextNodePosition(state.patternSearch.nodes)
      };
      return {
        patternSearch: {
          ...state.patternSearch,
          nodes: [...state.patternSearch.nodes, newNode],
          selectedNodeId: newNode.id,
          selectedEdgeId: null
        }
      };
    }),

  updateNode: (id, updates) =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: state.patternSearch.nodes.map(n => (n.id === id ? { ...n, ...updates } : n))
      }
    })),

  deleteNode: id =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: state.patternSearch.nodes.filter(n => n.id !== id),
        edges: state.patternSearch.edges.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id),
        selectedNodeId: state.patternSearch.selectedNodeId === id ? null : state.patternSearch.selectedNodeId
      }
    })),

  addNodeFilter: (nodeId, filter) =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: state.patternSearch.nodes.map(n =>
          n.id === nodeId ? { ...n, filters: [...n.filters, filter] } : n
        )
      }
    })),

  updateNodeFilter: (nodeId, filterIndex, updates) =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: state.patternSearch.nodes.map(n =>
          n.id === nodeId
            ? {
                ...n,
                filters: n.filters.map((f, i) => (i === filterIndex ? { ...f, ...updates } : f))
              }
            : n
        )
      }
    })),

  removeNodeFilter: (nodeId, filterIndex) =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: state.patternSearch.nodes.map(n =>
          n.id === nodeId ? { ...n, filters: n.filters.filter((_, i) => i !== filterIndex) } : n
        )
      }
    })),

  addEdge: (sourceNodeId, targetNodeId) =>
    set(state => {
      // Don't add duplicate edges
      const exists = state.patternSearch.edges.some(
        e => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId
      );
      if (exists) return state;

      const newEdge: PatternEdge = {
        id: `edge-${Date.now()}`,
        sourceNodeId,
        targetNodeId,
        predicates: []
      };
      return {
        patternSearch: {
          ...state.patternSearch,
          edges: [...state.patternSearch.edges, newEdge],
          selectedEdgeId: newEdge.id,
          selectedNodeId: null
        }
      };
    }),

  updateEdge: (id, updates) =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        edges: state.patternSearch.edges.map(e => (e.id === id ? { ...e, ...updates } : e))
      }
    })),

  deleteEdge: id =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        edges: state.patternSearch.edges.filter(e => e.id !== id),
        selectedEdgeId: state.patternSearch.selectedEdgeId === id ? null : state.patternSearch.selectedEdgeId
      }
    })),

  selectNode: id =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        selectedNodeId: id,
        selectedEdgeId: null
      }
    })),

  selectEdge: id =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        selectedEdgeId: id,
        selectedNodeId: null
      }
    })),

  clearPattern: () =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null
      }
    }))
});
```

**Step 2: Create selector file**

```typescript
// src/stores/pattern-search/pattern-search.selector.ts

/**
 * Pattern Search Selectors
 *
 * Selector hooks for accessing pattern search state from components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/stores/app.store';
import type { PatternSearchSlice } from './pattern-search.store';

// ============================================================================
// State Selectors
// ============================================================================

/** Get current search mode */
export const useSearchMode = () => useAppStore((state: PatternSearchSlice) => state.patternSearch.mode);

/** Get all pattern nodes */
export const usePatternNodes = () => useAppStore((state: PatternSearchSlice) => state.patternSearch.nodes);

/** Get all pattern edges */
export const usePatternEdges = () => useAppStore((state: PatternSearchSlice) => state.patternSearch.edges);

/** Get selected node ID */
export const useSelectedNodeId = () => useAppStore((state: PatternSearchSlice) => state.patternSearch.selectedNodeId);

/** Get selected edge ID */
export const useSelectedEdgeId = () => useAppStore((state: PatternSearchSlice) => state.patternSearch.selectedEdgeId);

/** Get selected node object (or null) */
export const useSelectedNode = () =>
  useAppStore((state: PatternSearchSlice) => {
    const id = state.patternSearch.selectedNodeId;
    return id ? state.patternSearch.nodes.find(n => n.id === id) ?? null : null;
  });

/** Get selected edge object (or null) */
export const useSelectedEdge = () =>
  useAppStore((state: PatternSearchSlice) => {
    const id = state.patternSearch.selectedEdgeId;
    return id ? state.patternSearch.edges.find(e => e.id === id) ?? null : null;
  });

// ============================================================================
// Action Selector
// ============================================================================

/** Get all pattern search actions */
export const usePatternSearchActions = () =>
  useAppStore(
    useShallow((state: PatternSearchSlice) => ({
      setSearchMode: state.setSearchMode,
      addNode: state.addNode,
      updateNode: state.updateNode,
      deleteNode: state.deleteNode,
      addNodeFilter: state.addNodeFilter,
      updateNodeFilter: state.updateNodeFilter,
      removeNodeFilter: state.removeNodeFilter,
      addEdge: state.addEdge,
      updateEdge: state.updateEdge,
      deleteEdge: state.deleteEdge,
      selectNode: state.selectNode,
      selectEdge: state.selectEdge,
      clearPattern: state.clearPattern
    }))
  );
```

**Step 3: Register slice in app store**

Modify `src/stores/app.store.ts`:

Add import:
```typescript
import { createPatternSearchSlice, PatternSearchSlice } from './pattern-search/pattern-search.store';
```

Add to AppStore type:
```typescript
type AppStore = AppConfigSlice &
  AppSettingsSlice &
  UiSlice &
  FileTreeSlice &
  OpenFilesSlice &
  TypeTabSlice &
  ProjectSlice &
  WorkspaceGraphSlice &
  PatternSearchSlice;
```

Add to store creation:
```typescript
...createPatternSearchSlice(...a)
```

**Step 4: Commit**

```bash
git add src/stores/pattern-search/pattern-search.store.ts src/stores/pattern-search/pattern-search.selector.ts src/stores/app.store.ts
git commit -m "feat(pattern-search): add Zustand store slice"
```

---

## Task 5: Create Pattern Search Service

**Files:**
- Create: `src/features/pattern-search/server/services/pattern.service.ts`

**Step 1: Create service file**

```typescript
// src/features/pattern-search/server/services/pattern.service.ts

import 'server-only';

import { getMockEntities, getMockRelationships } from '@/lib/mock-data';
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';
import type { PatternSearchParams, PatternSearchResponse, PatternMatch, PatternNode, PatternEdge } from '../../types';

/**
 * Check if a value matches any of the patterns (OR logic).
 * Patterns are treated as regex; invalid regex falls back to contains match.
 */
function matchesPatterns(value: string | undefined, patterns: string[]): boolean {
  if (!value) return patterns.length === 0;
  if (patterns.length === 0) return true;

  return patterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(value);
    } catch {
      // Invalid regex - treat as literal string match
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
    // Get attribute value from entity (supports nested access if needed in future)
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
  const isForward =
    relationship.sourceEntityId === sourceEntityId && relationship.relatedEntityId === targetEntityId;
  const isReverse =
    relationship.sourceEntityId === targetEntityId && relationship.relatedEntityId === sourceEntityId;

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
 * Search for pattern matches in the entity graph.
 * Returns paginated results with entities ordered alphabetically by node label.
 */
export async function searchPattern(params: PatternSearchParams): Promise<PatternSearchResponse> {
  const { pattern, pageSize, pageNumber } = params;

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

  // Apply pagination
  const totalCount = matches.length;
  const startIndex = (pageNumber - 1) * pageSize;
  const pagedMatches = matches.slice(startIndex, startIndex + pageSize);

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
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/server/services/pattern.service.ts
git commit -m "feat(pattern-search): add pattern matching service"
```

---

## Task 6: Create Pattern Search Router

**Files:**
- Create: `src/features/pattern-search/server/routers.ts`
- Modify: `src/lib/orpc/router.ts`

**Step 1: Create router file**

```typescript
// src/features/pattern-search/server/routers.ts

import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { entitySchema } from '@/models/entity.model';
import { relationshipSchema } from '@/models/relationship.model';
import * as patternService from './services/pattern.service';

/** API path prefix for pattern search endpoints */
const API_PATTERN_PREFIX = '/patterns';

/** OpenAPI tags for documentation grouping */
const tags = ['Pattern Search'];

/** Zod schema for attribute filter */
const attributeFilterSchema = z.object({
  attribute: z.string(),
  patterns: z.array(z.string())
});

/** Zod schema for pattern node */
const patternNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string().nullable(),
  filters: z.array(attributeFilterSchema),
  position: z.object({ x: z.number(), y: z.number() })
});

/** Zod schema for pattern edge */
const patternEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  predicates: z.array(z.string())
});

/** Zod schema for search pattern */
const searchPatternSchema = z.object({
  nodes: z.array(patternNodeSchema),
  edges: z.array(patternEdgeSchema)
});

/** Zod schema for pattern match */
const patternMatchSchema = z.object({
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema)
});

/** Zod schema for pattern search response */
const patternSearchResponseSchema = z.object({
  matches: z.array(patternMatchSchema),
  totalCount: z.number(),
  pageNumber: z.number(),
  pageSize: z.number()
});

/**
 * Pattern Search Router - oRPC procedures for graph pattern matching.
 */
export const patternRouter = appProcedure.router({
  /**
   * POST /patterns/search - Search for pattern matches in the entity graph.
   * Returns paginated list of matches, each containing matched entities and relationships.
   */
  search: appProcedure
    .route({
      method: 'POST',
      path: `${API_PATTERN_PREFIX}/search`,
      summary: 'Search for pattern matches',
      tags
    })
    .input(
      z.object({
        pattern: searchPatternSchema,
        pageSize: z.number(),
        pageNumber: z.number()
      })
    )
    .output(patternSearchResponseSchema)
    .handler(async ({ input }) => {
      return patternService.searchPattern(input);
    }),

  /**
   * GET /patterns/predicates - Get available relationship predicates.
   * Returns array of predicate strings for the edge filter UI.
   */
  getPredicates: appProcedure
    .route({
      method: 'GET',
      path: `${API_PATTERN_PREFIX}/predicates`,
      summary: 'Get available relationship predicates',
      tags
    })
    .output(z.array(z.string()))
    .handler(async () => {
      return patternService.getPredicates();
    })
});
```

**Step 2: Register router in main router**

Modify `src/lib/orpc/router.ts`:

Add import:
```typescript
import { patternRouter } from '@/features/pattern-search/server/routers';
```

Add to router object:
```typescript
export const router = {
  appConfig: appConfigRouter,
  appSettings: appSettingsRouter,
  entity: entityRouter,
  files: filesRouter,
  project: projectRouter,
  todo: todoRouter,
  workspace: workspaceRouter,
  pattern: patternRouter
};
```

**Step 3: Commit**

```bash
git add src/features/pattern-search/server/routers.ts src/lib/orpc/router.ts
git commit -m "feat(pattern-search): add ORPC router and register"
```

---

## Task 7: Create Pattern Search Hooks

**Files:**
- Create: `src/features/pattern-search/hooks/usePatternSearchMutation.ts`
- Create: `src/features/pattern-search/hooks/usePredicatesQuery.ts`

**Step 1: Create search mutation hook**

```typescript
// src/features/pattern-search/hooks/usePatternSearchMutation.ts

import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import { toast } from 'sonner';
import type { PatternSearchParams } from '../types';

/**
 * Mutation hook for executing pattern search.
 * Uses mutation instead of query because search is triggered on-demand.
 */
export const usePatternSearchMutation = () => {
  return useMutation(
    orpc.pattern.search.mutationOptions({
      onError: error => {
        toast.error(`Search failed: ${error.message}`);
      }
    })
  );
};
```

**Step 2: Create predicates query hook**

```typescript
// src/features/pattern-search/hooks/usePredicatesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';

/**
 * Query hook for fetching available relationship predicates.
 * Used to populate the edge predicate filter checkboxes.
 */
export const usePredicatesQuery = () => {
  return useQuery(orpc.pattern.getPredicates.queryOptions());
};
```

**Step 3: Commit**

```bash
git add src/features/pattern-search/hooks/usePatternSearchMutation.ts src/features/pattern-search/hooks/usePredicatesQuery.ts
git commit -m "feat(pattern-search): add React Query hooks"
```

---

## Task 8: Create Pattern Node Component (React Flow)

**Files:**
- Create: `src/features/pattern-search/components/pattern-node.component.tsx`

**Step 1: Create pattern node component**

```typescript
// src/features/pattern-search/components/pattern-node.component.tsx

'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn, getEntityIconClass } from '@/lib/utils';
import type { PatternNode } from '../types';

/** Props passed to custom node by React Flow */
interface PatternNodeData {
  label: string;
  type: string | null;
  filters: Array<{ attribute: string; patterns: string[] }>;
  selected: boolean;
}

/**
 * Custom React Flow node for pattern builder.
 * Displays entity type icon, label, and filter summary.
 * Has input/output handles for creating connections.
 */
const PatternNodeComponent = ({ data }: NodeProps<PatternNodeData>) => {
  const iconClass = data.type ? getEntityIconClass(data.type) : 'ri-question-line';

  // Build filter summary text
  const filterSummary = data.filters.length > 0 ? `${data.filters.length} filter(s)` : null;

  return (
    <div
      className={cn(
        'bg-card border-border flex min-w-[120px] flex-col items-center rounded-lg border-2 p-2 shadow-sm',
        data.selected && 'border-primary ring-primary/20 ring-2'
      )}
    >
      {/* Input handle (left side) */}
      <Handle type="target" position={Position.Left} className="!bg-primary !h-3 !w-3" />

      {/* Entity icon */}
      <div className="bg-muted mb-1 flex h-10 w-10 items-center justify-center rounded">
        <i className={cn('text-muted-foreground text-xl', iconClass)} />
      </div>

      {/* Node label */}
      <div className="text-sm font-medium">{data.label}</div>

      {/* Type badge */}
      <div className="text-muted-foreground text-xs">{data.type ?? 'Any Type'}</div>

      {/* Filter summary */}
      {filterSummary && <div className="text-muted-foreground mt-1 text-xs italic">{filterSummary}</div>}

      {/* Output handle (right side) */}
      <Handle type="source" position={Position.Right} className="!bg-primary !h-3 !w-3" />
    </div>
  );
};

export default memo(PatternNodeComponent);
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/pattern-node.component.tsx
git commit -m "feat(pattern-search): add React Flow pattern node component"
```

---

## Task 9: Create Pattern Edge Component (React Flow)

**Files:**
- Create: `src/features/pattern-search/components/pattern-edge.component.tsx`

**Step 1: Create pattern edge component**

```typescript
// src/features/pattern-search/components/pattern-edge.component.tsx

'use client';

import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

/** Props passed to custom edge by React Flow */
interface PatternEdgeData {
  predicates: string[];
  selected: boolean;
}

/**
 * Custom React Flow edge for pattern builder.
 * Displays arrow with predicate label and selection state.
 */
const PatternEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}: EdgeProps<PatternEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  // Build label text
  const labelText =
    data?.predicates && data.predicates.length > 0
      ? data.predicates.length === 1
        ? data.predicates[0]
        : `${data.predicates.length} predicates`
      : 'Any';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={cn('!stroke-2', data?.selected ? '!stroke-primary' : '!stroke-muted-foreground')}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            'nodrag nopan bg-background border-border absolute rounded border px-1.5 py-0.5 text-xs',
            data?.selected && 'border-primary text-primary'
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
        >
          {labelText}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(PatternEdgeComponent);
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/pattern-edge.component.tsx
git commit -m "feat(pattern-search): add React Flow pattern edge component"
```

---

## Task 10: Create Node Config Panel Component

**Files:**
- Create: `src/features/pattern-search/components/node-config-panel.component.tsx`

**Step 1: Create node config panel component**

```typescript
// src/features/pattern-search/components/node-config-panel.component.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import { useEntityTypesQuery } from '@/features/entity-search/hooks/useEntityTypesQuery';
import { ENTITY_ATTRIBUTES } from '../const';
import type { PatternNode, AttributeFilter } from '../types';

interface Props {
  node: PatternNode;
  onUpdate: (updates: Partial<Omit<PatternNode, 'id'>>) => void;
  onAddFilter: (filter: AttributeFilter) => void;
  onUpdateFilter: (filterIndex: number, updates: Partial<AttributeFilter>) => void;
  onRemoveFilter: (filterIndex: number) => void;
  onDelete: () => void;
}

/**
 * Configuration panel for a selected pattern node.
 * Allows editing type filter and generic attribute filters.
 */
const NodeConfigPanelComponent = ({
  node,
  onUpdate,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onDelete
}: Props) => {
  const [filtersOpen, setFiltersOpen] = useState(node.filters.length > 0);
  const [newAttribute, setNewAttribute] = useState(ENTITY_ATTRIBUTES[0].key);
  const [newPattern, setNewPattern] = useState('');

  // Fetch available entity types
  const { data: entityTypes = [] } = useEntityTypesQuery();

  // Handle type change
  const handleTypeChange = (value: string) => {
    onUpdate({ type: value === 'any' ? null : value });
  };

  // Add new filter
  const handleAddFilter = () => {
    if (newPattern.trim()) {
      // Check if filter for this attribute already exists
      const existingIndex = node.filters.findIndex(f => f.attribute === newAttribute);
      if (existingIndex >= 0) {
        // Add pattern to existing filter
        const existing = node.filters[existingIndex];
        onUpdateFilter(existingIndex, {
          patterns: [...existing.patterns, newPattern.trim()]
        });
      } else {
        // Create new filter
        onAddFilter({ attribute: newAttribute, patterns: [newPattern.trim()] });
      }
      setNewPattern('');
    }
  };

  // Remove a pattern from a filter
  const handleRemovePattern = (filterIndex: number, patternIndex: number) => {
    const filter = node.filters[filterIndex];
    const newPatterns = filter.patterns.filter((_, i) => i !== patternIndex);
    if (newPatterns.length === 0) {
      // Remove entire filter if no patterns left
      onRemoveFilter(filterIndex);
    } else {
      onUpdateFilter(filterIndex, { patterns: newPatterns });
    }
  };

  // Handle Enter key in pattern input
  const handlePatternKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFilter();
    }
  };

  // Get attribute label from key
  const getAttributeLabel = (key: string) => {
    return ENTITY_ATTRIBUTES.find(a => a.key === key)?.label ?? key;
  };

  return (
    <div className="flex flex-col gap-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{node.label}</span>
      </div>

      {/* Type selector */}
      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">Type</Label>
        <Select value={node.type ?? 'any'} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Type</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters section (collapsible) */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-x-1 text-xs font-medium">
          {filtersOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
          Filters ({node.filters.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 flex flex-col gap-y-3">
          {/* Existing filters grouped by attribute */}
          {node.filters.map((filter, filterIndex) => (
            <div key={filterIndex} className="flex flex-col gap-y-1">
              <Label className="text-xs text-muted-foreground">
                {getAttributeLabel(filter.attribute)} matches (any of):
              </Label>
              {filter.patterns.map((pattern, patternIndex) => (
                <div key={patternIndex} className="flex items-center gap-x-1">
                  <Input value={pattern} disabled className="h-7 flex-1 text-xs" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRemovePattern(filterIndex, patternIndex)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))}

          {/* Add new filter */}
          <div className="flex flex-col gap-y-1">
            <Label className="text-xs">Add filter:</Label>
            <Select value={newAttribute} onValueChange={setNewAttribute}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_ATTRIBUTES.map(attr => (
                  <SelectItem key={attr.key} value={attr.key}>
                    {attr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-x-1">
              <Input
                value={newPattern}
                onChange={e => setNewPattern(e.target.value)}
                onKeyDown={handlePatternKeyDown}
                placeholder="e.g., ^John"
                className="h-7 flex-1 text-xs"
              />
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAddFilter}>
                <PlusIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete button */}
      <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={onDelete}>
        <TrashIcon className="mr-1 h-3 w-3" />
        Delete Node
      </Button>
    </div>
  );
};

export default NodeConfigPanelComponent;
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/node-config-panel.component.tsx
git commit -m "feat(pattern-search): add node config panel component"
```

---

## Task 11: Create Edge Config Panel Component

**Files:**
- Create: `src/features/pattern-search/components/edge-config-panel.component.tsx`

**Step 1: Create edge config panel component**

```typescript
// src/features/pattern-search/components/edge-config-panel.component.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrashIcon } from 'lucide-react';
import { usePredicatesQuery } from '../hooks/usePredicatesQuery';
import type { PatternEdge, PatternNode } from '../types';

interface Props {
  edge: PatternEdge;
  nodes: PatternNode[];
  onUpdate: (updates: Partial<Omit<PatternEdge, 'id'>>) => void;
  onDelete: () => void;
}

/**
 * Configuration panel for a selected pattern edge.
 * Allows editing source/target nodes and predicate filters.
 */
const EdgeConfigPanelComponent = ({ edge, nodes, onUpdate, onDelete }: Props) => {
  // Fetch available predicates
  const { data: predicates = [] } = usePredicatesQuery();

  // Get source and target node labels
  const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);
  const targetNode = nodes.find(n => n.id === edge.targetNodeId);

  // Handle source change
  const handleSourceChange = (nodeId: string) => {
    if (nodeId !== edge.targetNodeId) {
      onUpdate({ sourceNodeId: nodeId });
    }
  };

  // Handle target change
  const handleTargetChange = (nodeId: string) => {
    if (nodeId !== edge.sourceNodeId) {
      onUpdate({ targetNodeId: nodeId });
    }
  };

  // Toggle predicate selection
  const handlePredicateToggle = (predicate: string) => {
    const current = edge.predicates;
    const updated = current.includes(predicate)
      ? current.filter(p => p !== predicate)
      : [...current, predicate];
    onUpdate({ predicates: updated });
  };

  // Toggle "Any" (clear all predicates)
  const handleAnyToggle = () => {
    if (edge.predicates.length > 0) {
      onUpdate({ predicates: [] });
    }
  };

  const isAnySelected = edge.predicates.length === 0;

  return (
    <div className="flex flex-col gap-y-3 p-3">
      {/* Header */}
      <div className="font-medium">Edge</div>

      {/* From/To selectors */}
      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">From</Label>
        <Select value={edge.sourceNodeId} onValueChange={handleSourceChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nodes
              .filter(n => n.id !== edge.targetNodeId)
              .map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">To</Label>
        <Select value={edge.targetNodeId} onValueChange={handleTargetChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nodes
              .filter(n => n.id !== edge.sourceNodeId)
              .map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Predicate checkboxes */}
      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">Predicates</Label>
        <div className="flex flex-col gap-y-1">
          {/* Any option */}
          <label className="hover:bg-accent flex cursor-pointer items-center gap-x-2 rounded p-1">
            <Checkbox checked={isAnySelected} onCheckedChange={handleAnyToggle} />
            <span className="text-xs">Any</span>
          </label>

          {/* Individual predicates */}
          {predicates.map(predicate => (
            <label key={predicate} className="hover:bg-accent flex cursor-pointer items-center gap-x-2 rounded p-1">
              <Checkbox
                checked={edge.predicates.includes(predicate)}
                onCheckedChange={() => handlePredicateToggle(predicate)}
              />
              <span className="text-xs">{predicate}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Delete button */}
      <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={onDelete}>
        <TrashIcon className="mr-1 h-3 w-3" />
        Delete Edge
      </Button>
    </div>
  );
};

export default EdgeConfigPanelComponent;
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/edge-config-panel.component.tsx
git commit -m "feat(pattern-search): add edge config panel component"
```

---

## Task 12: Create Pattern Match Row Component

**Files:**
- Create: `src/features/pattern-search/components/pattern-match-row.component.tsx`

**Step 1: Create pattern match row component**

```typescript
// src/features/pattern-search/components/pattern-match-row.component.tsx

'use client';

import { Card } from '@/components/ui/card';
import { cn, getEntityIconClass } from '@/lib/utils';
import type { PatternMatch } from '../types';
import { ArrowRightIcon } from 'lucide-react';

interface Props {
  match: PatternMatch;
}

/**
 * Displays a single pattern match as a linear chain of entities.
 * Entities are shown with their icon and name, connected by arrows showing the relationship.
 */
const PatternMatchRowComponent = ({ match }: Props) => {
  const { entities, relationships } = match;

  // Build relationship map for quick lookup
  // Key: "entityId1-entityId2", Value: { predicate, direction }
  const relationshipMap = new Map<string, { predicate: string; isForward: boolean }>();
  for (const rel of relationships) {
    // Store both directions for lookup
    relationshipMap.set(`${rel.sourceEntityId}-${rel.relatedEntityId}`, {
      predicate: rel.predicate,
      isForward: true
    });
    relationshipMap.set(`${rel.relatedEntityId}-${rel.sourceEntityId}`, {
      predicate: rel.predicate,
      isForward: false
    });
  }

  return (
    <Card className="flex items-center gap-x-2 overflow-x-auto p-3">
      {entities.map((entity, index) => {
        const iconClass = getEntityIconClass(entity.type);

        // Get relationship to next entity (if any)
        const nextEntity = entities[index + 1];
        let relationshipInfo: { predicate: string; isForward: boolean } | null = null;
        if (nextEntity) {
          relationshipInfo = relationshipMap.get(`${entity.id}-${nextEntity.id}`) ?? null;
        }

        return (
          <div key={entity.id} className="flex items-center gap-x-2">
            {/* Entity box */}
            <div className="flex flex-col items-center">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                <i className={cn('text-muted-foreground text-xl', iconClass)} />
              </div>
              <span className="mt-1 max-w-[100px] truncate text-xs">{entity.labelNormalized}</span>
            </div>

            {/* Arrow to next entity */}
            {relationshipInfo && (
              <div className="flex flex-col items-center gap-y-0.5">
                <span className="text-muted-foreground text-xs">{relationshipInfo.predicate}</span>
                <ArrowRightIcon
                  className={cn('text-muted-foreground h-4 w-4', !relationshipInfo.isForward && 'rotate-180')}
                />
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
};

export default PatternMatchRowComponent;
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/pattern-match-row.component.tsx
git commit -m "feat(pattern-search): add pattern match row component"
```

---

## Task 13: Create Pattern Results Component

**Files:**
- Create: `src/features/pattern-search/components/pattern-results.component.tsx`

**Step 1: Create pattern results component**

```typescript
// src/features/pattern-search/components/pattern-results.component.tsx

'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import PatternMatchRowComponent from './pattern-match-row.component';
import type { PatternSearchResponse } from '../types';

interface Props {
  data: PatternSearchResponse | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Displays pattern search results with pagination.
 * Each result is a linear chain of matched entities.
 */
const PatternResultsComponent = ({ data, isLoading, onPageChange }: Props) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        Searching...
      </div>
    );
  }

  // No search yet
  if (!data) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        Run a search to see results
      </div>
    );
  }

  // Empty results
  if (data.matches.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
        No matches found
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.totalCount / data.pageSize);
  const hasPrev = data.pageNumber > 1;
  const hasNext = data.pageNumber < totalPages;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-y-2">
      {/* Header with count */}
      <div className="text-muted-foreground text-xs">
        Results ({data.totalCount} matches)
      </div>

      {/* Results list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-y-2 pr-2">
          {data.matches.map((match, index) => (
            <PatternMatchRowComponent key={index} match={match} />
          ))}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {data.pageNumber} of {totalPages}
          </span>
          <div className="flex gap-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!hasPrev}
              onClick={() => onPageChange(data.pageNumber - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!hasNext}
              onClick={() => onPageChange(data.pageNumber + 1)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternResultsComponent;
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/pattern-results.component.tsx
git commit -m "feat(pattern-search): add pattern results component"
```

---

## Task 14: Create Pattern Builder Component

**Files:**
- Create: `src/features/pattern-search/components/pattern-builder.component.tsx`

**Step 1: Create pattern builder component**

```typescript
// src/features/pattern-search/components/pattern-builder.component.tsx

'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlusIcon, SearchIcon } from 'lucide-react';
import PatternNodeComponent from './pattern-node.component';
import PatternEdgeComponent from './pattern-edge.component';
import NodeConfigPanelComponent from './node-config-panel.component';
import EdgeConfigPanelComponent from './edge-config-panel.component';
import {
  usePatternNodes,
  usePatternEdges,
  useSelectedNode,
  useSelectedEdge,
  usePatternSearchActions
} from '@/stores/pattern-search/pattern-search.selector';
import type { PatternNode, PatternEdge } from '../types';

/** Register custom node types */
const nodeTypes = {
  patternNode: PatternNodeComponent
};

/** Register custom edge types */
const edgeTypes = {
  patternEdge: PatternEdgeComponent
};

interface Props {
  onSearch: () => void;
  isSearching: boolean;
}

/**
 * Pattern builder component with React Flow canvas.
 * Manages node/edge creation, selection, and configuration.
 */
const PatternBuilderComponent = ({ onSearch, isSearching }: Props) => {
  // Get pattern state from store
  const patternNodes = usePatternNodes();
  const patternEdges = usePatternEdges();
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  const {
    addNode,
    updateNode,
    deleteNode,
    addNodeFilter,
    updateNodeFilter,
    removeNodeFilter,
    addEdge,
    updateEdge,
    deleteEdge,
    selectNode,
    selectEdge
  } = usePatternSearchActions();

  // Convert store nodes to React Flow nodes
  const flowNodes: Node[] = useMemo(
    () =>
      patternNodes.map(node => ({
        id: node.id,
        type: 'patternNode',
        position: node.position,
        data: {
          label: node.label,
          type: node.type,
          filters: node.filters,
          selected: selectedNode?.id === node.id
        }
      })),
    [patternNodes, selectedNode]
  );

  // Convert store edges to React Flow edges
  const flowEdges: Edge[] = useMemo(
    () =>
      patternEdges.map(edge => ({
        id: edge.id,
        type: 'patternEdge',
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          predicates: edge.predicates,
          selected: selectedEdge?.id === edge.id
        }
      })),
    [patternEdges, selectedEdge]
  );

  // Handle node position changes
  const onNodesChange: OnNodesChange = useCallback(
    changes => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNode(change.id, { position: change.position });
        }
      }
    },
    [updateNode]
  );

  // Handle edge changes (not used for position, but required by React Flow)
  const onEdgesChange: OnEdgesChange = useCallback(changes => {
    // We handle edge deletion via config panel, not via React Flow
  }, []);

  // Handle new connection
  const onConnect: OnConnect = useCallback(
    connection => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target);
      }
    },
    [addEdge]
  );

  // Handle node click (select node)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle edge click (select edge)
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Check if search is possible (at least one node)
  const canSearch = patternNodes.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-x-2 py-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNode}>
          <PlusIcon className="mr-1 h-3 w-3" />
          Add Node
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs"
          onClick={onSearch}
          disabled={!canSearch || isSearching}
        >
          <SearchIcon className="mr-1 h-3 w-3" />
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      <Separator />

      {/* Canvas + Config Panel */}
      <div className="flex min-h-0 flex-1">
        {/* React Flow Canvas */}
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {(selectedNode || selectedEdge) && (
          <>
            <Separator orientation="vertical" />
            <div className="w-[200px] overflow-y-auto">
              {selectedNode && (
                <NodeConfigPanelComponent
                  node={selectedNode}
                  onUpdate={updates => updateNode(selectedNode.id, updates)}
                  onAddFilter={filter => addNodeFilter(selectedNode.id, filter)}
                  onUpdateFilter={(index, updates) => updateNodeFilter(selectedNode.id, index, updates)}
                  onRemoveFilter={index => removeNodeFilter(selectedNode.id, index)}
                  onDelete={() => deleteNode(selectedNode.id)}
                />
              )}
              {selectedEdge && (
                <EdgeConfigPanelComponent
                  edge={selectedEdge}
                  nodes={patternNodes}
                  onUpdate={updates => updateEdge(selectedEdge.id, updates)}
                  onDelete={() => deleteEdge(selectedEdge.id)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatternBuilderComponent;
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/pattern-builder.component.tsx
git commit -m "feat(pattern-search): add pattern builder component"
```

---

## Task 15: Create Advanced Search Component

**Files:**
- Create: `src/features/pattern-search/components/advanced-search.component.tsx`

**Step 1: Create advanced search component**

```typescript
// src/features/pattern-search/components/advanced-search.component.tsx

'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import PatternBuilderComponent from './pattern-builder.component';
import PatternResultsComponent from './pattern-results.component';
import { usePatternSearchMutation } from '../hooks/usePatternSearchMutation';
import { usePatternNodes, usePatternEdges } from '@/stores/pattern-search/pattern-search.selector';
import { DEFAULT_PATTERN_PAGE_SIZE } from '../const';
import type { PatternSearchResponse } from '../types';

/**
 * Advanced search component combining pattern builder and results.
 * Manages search execution and result pagination.
 */
const AdvancedSearchComponent = () => {
  const [pageNumber, setPageNumber] = useState(1);
  const [searchResults, setSearchResults] = useState<PatternSearchResponse | null>(null);

  // Get pattern from store
  const nodes = usePatternNodes();
  const edges = usePatternEdges();

  // Search mutation
  const { mutate: search, isPending } = usePatternSearchMutation();

  // Execute search
  const handleSearch = () => {
    setPageNumber(1);
    search(
      {
        pattern: { nodes, edges },
        pageSize: DEFAULT_PATTERN_PAGE_SIZE,
        pageNumber: 1
      },
      {
        onSuccess: data => {
          setSearchResults(data);
        }
      }
    );
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPageNumber(page);
    search(
      {
        pattern: { nodes, edges },
        pageSize: DEFAULT_PATTERN_PAGE_SIZE,
        pageNumber: page
      },
      {
        onSuccess: data => {
          setSearchResults(data);
        }
      }
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-y-2">
      {/* Pattern Builder */}
      <div className="flex min-h-[200px] flex-1 flex-col">
        <PatternBuilderComponent onSearch={handleSearch} isSearching={isPending} />
      </div>

      <Separator />

      {/* Results */}
      <div className="flex min-h-0 flex-1 flex-col">
        <PatternResultsComponent data={searchResults} isLoading={isPending} onPageChange={handlePageChange} />
      </div>
    </div>
  );
};

export default AdvancedSearchComponent;
```

**Step 2: Commit**

```bash
git add src/features/pattern-search/components/advanced-search.component.tsx
git commit -m "feat(pattern-search): add advanced search component"
```

---

## Task 16: Update Entity Search Component with Mode Toggle

**Files:**
- Modify: `src/features/entity-search/components/entity-search.component.tsx`

**Step 1: Add mode toggle and advanced search**

Update the entity search component to include:
1. Import the new components and hooks
2. Add Simple/Advanced toggle using RadioGroup
3. Conditionally render simple search or advanced search based on mode
4. Adjust container width when in advanced mode

```typescript
// src/features/entity-search/components/entity-search.component.tsx

'use client';

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import EntitySearchFormComponent from './entity-search-form.component';
import EntitySearchToolbarComponent from './entity-search-toolbar.component';
import EntitySearchResultsComponent from './entity-search-results.component';
import AdvancedSearchComponent from '@/features/pattern-search/components/advanced-search.component';
import { useEntitySearchQuery } from '../hooks/useEntitySearchQuery';
import { useSearchMode, usePatternSearchActions } from '@/stores/pattern-search/pattern-search.selector';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT_DIRECTION } from '../const';
import type { SearchMode } from '@/features/pattern-search/types';

interface Props {
  pos: ToolbarPositions;
}

/** Search parameters state - combined into single object for cleaner state management */
interface SearchState {
  name: string;
  types: string[];
  pageNumber: number;
  sortDirection: 'asc' | 'desc';
  hasSearched: boolean;
}

const initialSearchState: SearchState = {
  name: '',
  types: [],
  pageNumber: 1,
  sortDirection: DEFAULT_SORT_DIRECTION,
  hasSearched: false
};

/**
 * Main entity search component.
 * Orchestrates simple search (form + results) and advanced search (pattern builder).
 * Mode toggle switches between Simple and Advanced views.
 */
const EntitySearchComponent = ({ pos }: Props) => {
  // All search-related state in single object (for simple mode)
  const [search, setSearch] = useState<SearchState>(initialSearchState);

  // Search mode from store
  const mode = useSearchMode();
  const { setSearchMode } = usePatternSearchActions();

  // Fetch search results (only when hasSearched is true, only for simple mode)
  const { data, isPending } = useEntitySearchQuery(
    {
      name: search.name,
      types: search.types.length > 0 ? search.types : undefined,
      sortDirection: search.sortDirection,
      pageSize: DEFAULT_PAGE_SIZE,
      pageNumber: search.pageNumber
    },
    search.hasSearched && mode === 'simple'
  );

  // Handle form submission - update search params and reset to page 1
  const handleSearch = (name: string, types: string[]) => {
    setSearch(prev => ({
      ...prev,
      name,
      types,
      pageNumber: 1,
      hasSearched: true
    }));
  };

  // Handle pagination - update page number (triggers refetch)
  const handlePageChange = (page: number) => {
    setSearch(prev => ({ ...prev, pageNumber: page }));
  };

  // Handle sort direction change - reset to page 1 when sorting changes
  const handleSortChange = (direction: 'asc' | 'desc') => {
    setSearch(prev => ({ ...prev, sortDirection: direction, pageNumber: 1 }));
  };

  // Handle mode change
  const handleModeChange = (value: string) => {
    setSearchMode(value as SearchMode);
  };

  return (
    <MainPanelsComponent title="Entity Search" pos={pos} focusPanelType="entity-search">
      <div className="flex h-full flex-col gap-y-2">
        {/* Mode toggle */}
        <RadioGroup value={mode} onValueChange={handleModeChange} className="flex gap-x-4">
          <div className="flex items-center gap-x-1">
            <RadioGroupItem value="simple" id="mode-simple" />
            <Label htmlFor="mode-simple" className="cursor-pointer text-xs">
              Simple
            </Label>
          </div>
          <div className="flex items-center gap-x-1">
            <RadioGroupItem value="advanced" id="mode-advanced" />
            <Label htmlFor="mode-advanced" className="cursor-pointer text-xs">
              Advanced
            </Label>
          </div>
        </RadioGroup>

        <Separator />

        {/* Simple mode: existing search UI */}
        {mode === 'simple' && (
          <>
            <EntitySearchFormComponent onSearch={handleSearch} />

            <Separator />

            {/* Results section (only shown after first search) */}
            {search.hasSearched && (
              <div className="flex min-h-0 flex-1 flex-col gap-y-2">
                <EntitySearchToolbarComponent
                  pageNumber={data?.pageNumber ?? 1}
                  pageSize={data?.pageSize ?? DEFAULT_PAGE_SIZE}
                  totalCount={data?.totalCount ?? 0}
                  sortDirection={search.sortDirection}
                  onPageChange={handlePageChange}
                  onSortChange={handleSortChange}
                />
                <EntitySearchResultsComponent entities={data?.entities ?? []} isLoading={isPending} />
              </div>
            )}
          </>
        )}

        {/* Advanced mode: pattern builder */}
        {mode === 'advanced' && <AdvancedSearchComponent />}
      </div>
    </MainPanelsComponent>
  );
};

export default EntitySearchComponent;
```

**Step 2: Install RadioGroup component if not exists**

Run:
```bash
npx shadcn@latest add radio-group
```

**Step 3: Commit**

```bash
git add src/features/entity-search/components/entity-search.component.tsx
git commit -m "feat(entity-search): add simple/advanced mode toggle"
```

---

## Task 17: Adjust Panel Width for Advanced Mode

**Files:**
- Modify panel width configuration to expand when advanced mode is active

This task depends on how the toolbar/panel system works. Based on the codebase, the panel width is likely controlled by the toolbar system. We need to investigate and update accordingly.

**Step 1: Check toolbar configuration**

Look at how panel widths are defined and if they can be dynamic.

**Step 2: Update panel width logic**

If panel widths are fixed, we may need to:
- Add a width prop to MainPanelsComponent
- Or adjust the toolbar slice to support dynamic widths
- Or use CSS to expand the panel when advanced mode is active

**Step 3: Commit**

```bash
git add [modified files]
git commit -m "feat(entity-search): expand panel width in advanced mode"
```

---

## Task 18: Test the Integration

**Step 1: Start the development server**

Run:
```bash
npm run dev
```

**Step 2: Manual testing checklist**

- [ ] Toggle between Simple and Advanced modes
- [ ] Add nodes to the pattern builder
- [ ] Configure node type and label filters
- [ ] Connect nodes by dragging from handles
- [ ] Configure edge predicates
- [ ] Delete nodes and edges
- [ ] Execute search and view results
- [ ] Pagination works correctly
- [ ] Results show correct relationship directions

**Step 3: Fix any issues discovered during testing**

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(pattern-search): complete graph pattern search feature"
```

---

## Review Section

### Summary of Changes

This implementation adds a graph pattern search feature to the Entity Search panel:

1. **New Feature Structure**: `src/features/pattern-search/` with types, constants, server code, hooks, and components
2. **Zustand Store**: New `pattern-search` slice for managing pattern builder state
3. **ORPC Router**: New `pattern` router with `search` and `getPredicates` endpoints
4. **React Flow Integration**: Custom node and edge components for visual pattern building
5. **UI Components**: Pattern builder, config panels, results display with linear chain visualization
6. **Entity Search Integration**: Mode toggle between Simple and Advanced search

### Key Design Decisions

- **Generic attribute filtering**: Nodes support filters on any entity attribute (labelNormalized, email, role, department), not just label
- **AND/OR filter logic**: AND between different filters, OR within each filter's patterns
- **Bidirectional matching**: Edges match relationships in either direction
- **OR logic for predicates**: Multiple predicates use OR (match any)
- **Alphabetical ordering**: Results are ordered by node label (Node A, Node B, etc.)
- **Linear chain display**: Results flatten branching patterns into linear chains
- **Client-side pattern state**: Pattern definition lives in Zustand, only serialized pattern sent to API
- **Extensible attributes**: New attributes can be added to `ENTITY_ATTRIBUTES` constant

### Files Created

- `src/features/pattern-search/types.ts`
- `src/features/pattern-search/const.ts`
- `src/features/pattern-search/server/routers.ts`
- `src/features/pattern-search/server/services/pattern.service.ts`
- `src/features/pattern-search/hooks/usePatternSearchMutation.ts`
- `src/features/pattern-search/hooks/usePredicatesQuery.ts`
- `src/features/pattern-search/components/pattern-node.component.tsx`
- `src/features/pattern-search/components/pattern-edge.component.tsx`
- `src/features/pattern-search/components/node-config-panel.component.tsx`
- `src/features/pattern-search/components/edge-config-panel.component.tsx`
- `src/features/pattern-search/components/pattern-match-row.component.tsx`
- `src/features/pattern-search/components/pattern-results.component.tsx`
- `src/features/pattern-search/components/pattern-builder.component.tsx`
- `src/features/pattern-search/components/advanced-search.component.tsx`
- `src/stores/pattern-search/pattern-search.store.ts`
- `src/stores/pattern-search/pattern-search.selector.ts`

### Files Modified

- `package.json` (add @xyflow/react)
- `src/stores/app.store.ts` (register pattern-search slice)
- `src/lib/orpc/router.ts` (register pattern router)
- `src/features/entity-search/components/entity-search.component.tsx` (add mode toggle)
