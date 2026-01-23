/**
 * Workspace Graph Store Slice
 *
 * Per-workspace graph state (selection, etc.) keyed by workspaceId.
 * Extensible — each workspace entry can hold additional state in the future.
 */

import { StateCreator } from 'zustand';

/** State for a single workspace graph instance */
interface WorkspaceGraphEntry {
  /** IDs of currently selected entity nodes (undefined when none selected) */
  selectedEntityIds?: string[];
}

/** Slice state: map of workspaceId → workspace graph state */
export interface WorkspaceGraphState {
  workspaceGraph: Record<string, WorkspaceGraphEntry>;
}

/** Slice actions for managing workspace graph state */
export interface WorkspaceGraphActions {
  /** Replace the entire selection for a workspace */
  setSelectedEntityIds: (workspaceId: string, ids: string[]) => void;
  /** Toggle a single entity in/out of the selection */
  toggleEntitySelection: (workspaceId: string, id: string) => void;
  /** Remove the workspace entry entirely (cleanup on file close) */
  clearEntitySelection: (workspaceId: string) => void;
}

export type WorkspaceGraphSlice = WorkspaceGraphState & WorkspaceGraphActions;

export const createWorkspaceGraphSlice: StateCreator<WorkspaceGraphSlice, [], [], WorkspaceGraphSlice> = set => ({
  workspaceGraph: {},

  setSelectedEntityIds: (workspaceId, ids) =>
    set(state => ({
      workspaceGraph: {
        ...state.workspaceGraph,
        [workspaceId]: { ...state.workspaceGraph[workspaceId], selectedEntityIds: ids.length ? ids : undefined }
      }
    })),

  toggleEntitySelection: (workspaceId, id) =>
    set(state => {
      const entry = state.workspaceGraph[workspaceId];
      const current = entry?.selectedEntityIds ?? [];
      // Remove if already selected, add if not
      const updated = current.includes(id) ? current.filter(eid => eid !== id) : [...current, id];
      return {
        workspaceGraph: {
          ...state.workspaceGraph,
          [workspaceId]: { ...state.workspaceGraph[workspaceId], selectedEntityIds: updated.length ? updated : undefined }
        }
      };
    }),

  clearEntitySelection: workspaceId =>
    set(state => {
      if (!state.workspaceGraph[workspaceId]) return state;
      // Remove the workspace entry entirely
      return {
        workspaceGraph: Object.fromEntries(Object.entries(state.workspaceGraph).filter(([key]) => key !== workspaceId))
      };
    })
});
