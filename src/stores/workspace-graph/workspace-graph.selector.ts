/**
 * Workspace Graph Selectors
 *
 * Selector hooks for accessing workspace graph state in components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../app.store';
import { PopupState, WorkspaceGraphSlice } from './workspace-graph.store';

const EMPTY_IDS: string[] = [];
const EMPTY_POPUPS: PopupState[] = [];
const EMPTY_HIDDEN: string[] = [];

/** Get the selected entity IDs for a specific workspace */
export const useSelectedEntityIds = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.selectedEntityIds ?? EMPTY_IDS);

/** Get the open popups for a specific workspace */
export const useOpenPopups = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.openPopups ?? EMPTY_POPUPS);

/** Get the hidden entity types for a specific workspace */
export const useHiddenEntityTypes = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.hiddenEntityTypes ?? EMPTY_HIDDEN);

/** Get the hidden predicates for a specific workspace */
export const useHiddenPredicates = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.hiddenPredicates ?? EMPTY_HIDDEN);

/** Get whether the filter panel is open for a specific workspace */
export const useIsFilterPanelOpen = (workspaceId: string) =>
  useAppStore((state: WorkspaceGraphSlice) => state.workspaceGraph[workspaceId]?.isFilterPanelOpen ?? false);

/** Get the total count of hidden filters (entity types + predicates) */
export const useHiddenFilterCount = (workspaceId: string) =>
  useAppStore(
    (state: WorkspaceGraphSlice) =>
      (state.workspaceGraph[workspaceId]?.hiddenEntityTypes?.length ?? 0) +
      (state.workspaceGraph[workspaceId]?.hiddenPredicates?.length ?? 0)
  );

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
      clearEntitySelection: state.clearEntitySelection,
      openPopup: state.openPopup,
      closePopup: state.closePopup,
      updatePopupPosition: state.updatePopupPosition,
      toggleEntityTypeVisibility: state.toggleEntityTypeVisibility,
      togglePredicateVisibility: state.togglePredicateVisibility,
      resetFilters: state.resetFilters,
      setFilterPanelOpen: state.setFilterPanelOpen
    }))
  );
