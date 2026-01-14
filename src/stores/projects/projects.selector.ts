/**
 * Project Selectors
 *
 * Selector hooks for accessing project state from components.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/stores/app.store';
import { ProjectSlice } from './projects.store';

// ============================================================================
// State Selectors
// ============================================================================

/** Get the current project */
export const useCurrentProject = () => useAppStore((state: ProjectSlice) => state.project.currentProject);

/** Check if project selector modal is open */
export const useProjectModalOpen = () => useAppStore((state: ProjectSlice) => state.project.isModalOpen);

/** Check if a project is loaded */
export const useHasProject = () => useAppStore((state: ProjectSlice) => state.project.currentProject !== null);

/** Check if project is loading (switching projects) */
export const useProjectLoading = () => useAppStore((state: ProjectSlice) => state.project.isLoading);

// ============================================================================
// Action Selector
// ============================================================================

/** Get all project actions */
export const useProjectActions = () =>
  useAppStore(
    useShallow((state: ProjectSlice) => ({
      setCurrentProject: state.setCurrentProject,
      setProjectModalOpen: state.setProjectModalOpen,
      setProjectLoading: state.setProjectLoading,
      resetProjectState: state.resetProjectState
    }))
  );
