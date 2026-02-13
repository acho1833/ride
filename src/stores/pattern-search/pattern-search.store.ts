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
    /** Entity IDs to highlight in open workspaces (from clicking a pattern match) */
    highlightedEntityIds: string[];
    /** Currently selected pattern match ID in results (null if none) */
    selectedMatchId: string | null;
  };
}

/** Pattern search actions interface */
export interface PatternSearchActions {
  /** Set search mode (simple/advanced) */
  setSearchMode: (mode: SearchMode) => void;
  /** Add a new node to the pattern */
  addNode: () => void;
  /** Add a new node pre-populated from an entity (type + name filter) */
  addNodeFromEntity: (entityType: string, entityName: string, position?: { x: number; y: number }) => void;
  /** Update an existing node with entity data (replaces type and filters, selects node) */
  updateNodeFromEntity: (nodeId: string, entityType: string, entityName: string) => void;
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
  /** Set entity IDs to highlight in open workspaces */
  setHighlightedEntityIds: (ids: string[]) => void;
  /** Set selected pattern match ID in results */
  setSelectedMatchId: (id: string | null) => void;
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

/** Find the tail node of the chain (node with no outgoing edges).
 *  Returns null only if there are no nodes at all. */
function getChainTailNodeId(nodes: PatternNode[], edges: PatternEdge[]): string | null {
  if (nodes.length === 0) return null;
  if (edges.length === 0) return nodes[nodes.length - 1].id;

  const sourceIds = new Set(edges.map(e => e.sourceNodeId));

  // Tail = last node (by array order) that is part of the graph but has no outgoing edge
  for (let i = nodes.length - 1; i >= 0; i--) {
    const nodeId = nodes[i].id;
    const isInGraph = sourceIds.has(nodeId) || edges.some(e => e.targetNodeId === nodeId);
    if (isInGraph && !sourceIds.has(nodeId)) return nodeId;
  }

  return null;
}

/** Creates the pattern search slice */
export const createPatternSearchSlice: StateCreator<PatternSearchSlice, [], [], PatternSearchSlice> = set => ({
  patternSearch: {
    mode: 'simple',
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    highlightedEntityIds: [],
    selectedMatchId: null
  },

  setSearchMode: mode =>
    set(state => ({
      patternSearch: { ...state.patternSearch, mode }
    })),

  addNode: () =>
    set(state => {
      const { nodes, edges } = state.patternSearch;
      const tailNodeId = getChainTailNodeId(nodes, edges);
      const newNode: PatternNode = {
        id: `node-${Date.now()}`,
        label: getNextNodeLabel(nodes),
        type: null,
        filters: [],
        position: getNextNodePosition(nodes)
      };
      const newEdges = tailNodeId
        ? [...edges, { id: `edge-${Date.now()}-auto`, sourceNodeId: tailNodeId, targetNodeId: newNode.id, predicates: [] }]
        : edges;
      return {
        patternSearch: {
          ...state.patternSearch,
          nodes: [...nodes, newNode],
          edges: newEdges,
          selectedNodeId: newNode.id,
          selectedEdgeId: null
        }
      };
    }),

  addNodeFromEntity: (entityType, entityName, position) =>
    set(state => {
      const { nodes, edges } = state.patternSearch;
      const tailNodeId = getChainTailNodeId(nodes, edges);
      const newNode: PatternNode = {
        id: `node-${Date.now()}`,
        label: getNextNodeLabel(nodes),
        type: entityType,
        filters: [{ attribute: 'labelNormalized', patterns: [entityName] }],
        position: position ?? getNextNodePosition(nodes)
      };
      const newEdges = tailNodeId
        ? [...edges, { id: `edge-${Date.now()}-auto`, sourceNodeId: tailNodeId, targetNodeId: newNode.id, predicates: [] }]
        : edges;
      return {
        patternSearch: {
          ...state.patternSearch,
          nodes: [...nodes, newNode],
          edges: newEdges,
          selectedNodeId: newNode.id,
          selectedEdgeId: null
        }
      };
    }),

  updateNodeFromEntity: (nodeId, entityType, entityName) =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        nodes: state.patternSearch.nodes.map(n =>
          n.id === nodeId ? { ...n, type: entityType, filters: [{ attribute: 'labelNormalized', patterns: [entityName] }] } : n
        ),
        selectedNodeId: nodeId,
        selectedEdgeId: null
      }
    })),

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
        nodes: state.patternSearch.nodes.map(n => (n.id === nodeId ? { ...n, filters: [...n.filters, filter] } : n))
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
        nodes: state.patternSearch.nodes.map(n => (n.id === nodeId ? { ...n, filters: n.filters.filter((_, i) => i !== filterIndex) } : n))
      }
    })),

  addEdge: (sourceNodeId, targetNodeId) =>
    set(state => {
      // Don't add duplicate edges
      const exists = state.patternSearch.edges.some(e => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId);
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
    })),

  setHighlightedEntityIds: ids =>
    set(state => ({
      patternSearch: {
        ...state.patternSearch,
        highlightedEntityIds: ids,
        selectedMatchId: ids.length === 0 ? null : state.patternSearch.selectedMatchId
      }
    })),

  setSelectedMatchId: id =>
    set(state => ({
      patternSearch: { ...state.patternSearch, selectedMatchId: id }
    }))
});
