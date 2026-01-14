/**
 * Project Store
 *
 * Zustand slice for managing the current project state.
 * Tracks the currently open project and modal visibility.
 */

import { StateCreator } from 'zustand';
import { Project } from '@/models/project.model';

/** Project state interface */
export interface ProjectState {
  project: {
    currentProject: Project | null;
    isModalOpen: boolean;
  };
}

/** Project action methods */
export interface ProjectActions {
  setCurrentProject: (project: Project | null) => void;
  setProjectModalOpen: (isOpen: boolean) => void;
  resetProjectState: () => void;
}

/** Combined project slice type */
export type ProjectSlice = ProjectState & ProjectActions;

/** Initial project state */
const initialProjectState: ProjectState['project'] = {
  currentProject: null,
  isModalOpen: false
};

/**
 * Creates the project slice for the store
 */
export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = set => ({
  project: initialProjectState,

  setCurrentProject: (currentProject: Project | null) =>
    set(() => ({
      project: { currentProject, isModalOpen: false }
    })),

  setProjectModalOpen: (isModalOpen: boolean) =>
    set(state => ({
      project: { ...state.project, isModalOpen }
    })),

  resetProjectState: () =>
    set(() => ({
      project: initialProjectState
    }))
});
