/**
 * Workspace Graph Selectors
 *
 * Selector hooks for accessing workspace graph state in components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { WorkspaceGraphSlice } from './workspace-graph.store';

const EMPTY_IDS: string[] = [];

/** Get the selected entity IDs for a specific workspace */
export const useSelectedEntityIds = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.selectedEntityIds ?? EMPTY_IDS);

/**
 * Get all workspace graph actions.
 * useShallow does a key-by-key comparison — if all values are the same
 * references as before, no re-render is triggered. Since action functions
 * are stable, this prevents re-renders from unrelated store updates.
 */
export const useWorkspaceGraphActions = () =>
  useAppStore(
    useShallow((state: WorkspaceGraphSlice) => ({
      setSelectedEntityIds: state.setSelectedEntityIds,
      toggleEntitySelection: state.toggleEntitySelection,
      clearEntitySelection: state.clearEntitySelection
    }))
  );
