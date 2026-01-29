/**
 * Workspace Graph Store Slice
 *
 * Per-workspace graph state (selection, popups, etc.) keyed by workspaceId.
 * Extensible — each workspace entry can hold additional state in the future.
 */

import { StateCreator } from 'zustand';

/** Represents an open popup in the workspace graph */
export interface PopupState {
  id: string; // Format: 'workspace-graph-popup-{entityId}'
  entityId: string;
  svgX: number; // SVG x coordinate
  svgY: number; // SVG y coordinate
}

/** State for a single workspace graph instance */
interface WorkspaceGraphEntry {
  /** IDs of currently selected entity nodes (undefined when none selected) */
  selectedEntityIds?: string[];
  /** Open entity detail popups (undefined when none open) */
  openPopups?: PopupState[];
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
  /** Clear entity selection for a workspace */
  clearEntitySelection: (workspaceId: string) => void;
  /** Open a popup for an entity */
  openPopup: (workspaceId: string, popup: PopupState) => void;
  /** Close a popup by ID */
  closePopup: (workspaceId: string, popupId: string) => void;
  /** Update popup position (after drag) */
  updatePopupPosition: (workspaceId: string, popupId: string, svgX: number, svgY: number) => void;
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
      const entry = state.workspaceGraph[workspaceId];
      if (!entry?.selectedEntityIds) return state;
      // Clear only selectedEntityIds, keep other state like popups
      return {
        workspaceGraph: {
          ...state.workspaceGraph,
          [workspaceId]: { ...entry, selectedEntityIds: undefined }
        }
      };
    }),

  openPopup: (workspaceId, popup) =>
    set(state => {
      const entry = state.workspaceGraph[workspaceId] ?? {};
      const existing = entry.openPopups ?? [];
      // Don't add if already open
      if (existing.some(p => p.id === popup.id)) return state;
      return {
        workspaceGraph: {
          ...state.workspaceGraph,
          [workspaceId]: { ...entry, openPopups: [...existing, popup] }
        }
      };
    }),

  closePopup: (workspaceId, popupId) =>
    set(state => {
      const entry = state.workspaceGraph[workspaceId];
      if (!entry?.openPopups) return state;
      const updated = entry.openPopups.filter(p => p.id !== popupId);
      return {
        workspaceGraph: {
          ...state.workspaceGraph,
          [workspaceId]: { ...entry, openPopups: updated.length ? updated : undefined }
        }
      };
    }),

  updatePopupPosition: (workspaceId, popupId, svgX, svgY) =>
    set(state => {
      const entry = state.workspaceGraph[workspaceId];
      if (!entry?.openPopups) return state;
      const updated = entry.openPopups.map(p => (p.id === popupId ? { ...p, svgX, svgY } : p));
      return {
        workspaceGraph: {
          ...state.workspaceGraph,
          [workspaceId]: { ...entry, openPopups: updated }
        }
      };
    })
});
