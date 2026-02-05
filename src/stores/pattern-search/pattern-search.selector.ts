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
    return id ? (state.patternSearch.nodes.find(n => n.id === id) ?? null) : null;
  });

/** Get selected edge object (or null) */
export const useSelectedEdge = () =>
  useAppStore((state: PatternSearchSlice) => {
    const id = state.patternSearch.selectedEdgeId;
    return id ? (state.patternSearch.edges.find(e => e.id === id) ?? null) : null;
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
