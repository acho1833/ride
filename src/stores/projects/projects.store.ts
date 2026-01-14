/**
 * Project Store
 *
 * Zustand slice for managing the current project state.
 * Tracks the currently open project and modal visibility.
 *
 * When currentProject is set to null, this slice automatically
 * resets file tree and open files state to ensure clean state.
 */

import { StateCreator } from 'zustand';
import { Project } from '@/models/project.model';
import { FileTreeSlice } from '@/stores/files/files.store';
import { OpenFilesSlice } from '@/stores/open-files/open-files.store';
import { AppSettingsSlice } from '@/stores/app-settings/app-settings.store';

/** Project state interface */
export interface ProjectState {
  project: {
    currentProject: Project | null;
    isModalOpen: boolean;
    isLoading: boolean;
  };
}

/** Project action methods */
export interface ProjectActions {
  setCurrentProject: (project: Project | null) => void;
  setProjectModalOpen: (isOpen: boolean) => void;
  setProjectLoading: (isLoading: boolean) => void;
  resetProjectState: () => void;
}

/** Combined project slice type */
export type ProjectSlice = ProjectState & ProjectActions;

/** Initial project state */
const initialProjectState: ProjectState['project'] = {
  currentProject: null,
  isModalOpen: false,
  isLoading: false
};

/**
 * Creates the project slice for the store
 *
 * Uses the full store type to access file tree and open files slices
 * for automatic cleanup when project is cleared.
 */
export const createProjectSlice: StateCreator<ProjectSlice & FileTreeSlice & OpenFilesSlice & AppSettingsSlice, [], [], ProjectSlice> = (
  set,
  get
) => ({
  project: initialProjectState,

  setCurrentProject: (currentProject: Project | null) => {
    // When clearing the project, also reset dependent state
    if (currentProject === null) {
      get().resetFileTreeState();
      get().resetOpenFilesState();
      // Clear activeProjectId from app settings to prevent stale queries
      const appSettings = get().appSettings.data;
      if (appSettings) {
        get().setAppSettings({ ...appSettings, activeProjectId: null });
      }
    }
    set(state => ({
      project: { ...state.project, currentProject, isModalOpen: false, isLoading: false }
    }));
  },

  setProjectModalOpen: (isModalOpen: boolean) =>
    set(state => ({
      project: { ...state.project, isModalOpen }
    })),

  setProjectLoading: (isLoading: boolean) => {
    // When starting project switch, reset file tree and open files state
    // This ensures isFilesLoaded becomes false before query cache is cleared
    if (isLoading) {
      get().resetFileTreeState();
      get().resetOpenFilesState();
    }
    set(state => ({
      project: { ...state.project, isLoading }
    }));
  },

  resetProjectState: () =>
    set(() => ({
      project: initialProjectState
    }))
});
