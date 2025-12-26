/**
 * Open Files State Store
 *
 * Zustand slice for managing open files in split editor groups.
 */

import { StateCreator } from 'zustand';

// ============================================================================
// Types
// ============================================================================

/** Editor group identifier */
export type EditorGroup = 'left' | 'right';

/** Open file metadata */
export type OpenFile = {
  id: string;
  name: string;
};

/** State for a single editor group */
export type EditorGroupState = {
  files: OpenFile[];
  activeFileId: string | null;
};

/** Open files state interface */
export interface OpenFilesState {
  openFiles: {
    left: EditorGroupState;
    right: EditorGroupState;
    lastFocusedGroup: EditorGroup;
  };
}

/** Open files action methods */
export interface OpenFilesActions {
  openFile: (fileId: string, name: string, group: EditorGroup) => void;
  openFileById: (fileId: string, name: string) => void;
  closeFile: (fileId: string, group: EditorGroup) => void;
  setActiveFile: (fileId: string, group: EditorGroup) => void;
  closeAllFiles: (group: EditorGroup) => void;
  splitFileToRight: (fileId: string, name: string) => void;
  moveFileToGroup: (fileId: string, fromGroup: EditorGroup, toGroup: EditorGroup) => void;
  closeRightGroup: () => void;
  setLastFocusedGroup: (group: EditorGroup) => void;
}

/** Combined open files store type */
export type OpenFilesSlice = OpenFilesState & OpenFilesActions;

// ============================================================================
// Initial State
// ============================================================================

const initialEditorGroupState: EditorGroupState = {
  files: [],
  activeFileId: null
};

// ============================================================================
// Slice Creator
// ============================================================================

/**
 * Creates the open files slice for the store
 */
export const createOpenFilesSlice: StateCreator<OpenFilesSlice, [], [], OpenFilesSlice> = set => ({
  openFiles: {
    left: {
      ...initialEditorGroupState,
      activeFileId: 'id3',
      files: [
        {
          id: 'id3',
          name: 'sample3.ws'
        }
      ]
    },
    right: { ...initialEditorGroupState },
    lastFocusedGroup: 'left' as EditorGroup
  },

  // Open file in specific group
  openFile: (fileId: string, name: string, group: EditorGroup) =>
    set(state => {
      const groupState = state.openFiles[group];

      // Check if file already exists in this group
      const fileExists = groupState.files.some(f => f.id === fileId);

      if (fileExists) {
        // Just set it as active and update focus
        return {
          openFiles: {
            ...state.openFiles,
            [group]: {
              ...groupState,
              activeFileId: fileId
            },
            lastFocusedGroup: group
          }
        };
      }

      // Add new file and set as active and update focus
      return {
        openFiles: {
          ...state.openFiles,
          [group]: {
            files: [...groupState.files, { id: fileId, name }],
            activeFileId: fileId
          },
          lastFocusedGroup: group
        }
      };
    }),

  // Smart open: open in left if not exists anywhere, otherwise activate in existing group
  openFileById: (fileId: string, name: string) =>
    set(state => {
      const leftHasFile = state.openFiles.left.files.some(f => f.id === fileId);
      const rightHasFile = state.openFiles.right.files.some(f => f.id === fileId);

      if (leftHasFile) {
        // Activate in left group
        return {
          openFiles: {
            ...state.openFiles,
            left: {
              ...state.openFiles.left,
              activeFileId: fileId
            },
            lastFocusedGroup: 'left'
          }
        };
      }

      if (rightHasFile) {
        // Activate in right group
        return {
          openFiles: {
            ...state.openFiles,
            right: {
              ...state.openFiles.right,
              activeFileId: fileId
            },
            lastFocusedGroup: 'right'
          }
        };
      }

      // File doesn't exist anywhere, add to left group
      return {
        openFiles: {
          ...state.openFiles,
          left: {
            files: [...state.openFiles.left.files, { id: fileId, name }],
            activeFileId: fileId
          },
          lastFocusedGroup: 'left'
        }
      };
    }),

  // Close file from specific group
  closeFile: (fileId: string, group: EditorGroup) =>
    set(state => {
      const groupState = state.openFiles[group];
      const fileIndex = groupState.files.findIndex(f => f.id === fileId);

      if (fileIndex === -1) return state;

      const newFiles = groupState.files.filter(f => f.id !== fileId);
      let newActiveFileId = groupState.activeFileId;

      // If we're closing the active file, set next file as active
      if (groupState.activeFileId === fileId) {
        if (newFiles.length > 0) {
          // Try to activate the next file, or the previous one if we closed the last file
          const nextIndex = fileIndex < newFiles.length ? fileIndex : newFiles.length - 1;
          newActiveFileId = newFiles[nextIndex].id;
        } else {
          newActiveFileId = null;
        }
      }

      return {
        openFiles: {
          ...state.openFiles,
          [group]: {
            files: newFiles,
            activeFileId: newActiveFileId
          }
        }
      };
    }),

  // Set active file in group
  setActiveFile: (fileId: string, group: EditorGroup) =>
    set(state => ({
      openFiles: {
        ...state.openFiles,
        [group]: {
          ...state.openFiles[group],
          activeFileId: fileId
        },
        lastFocusedGroup: group
      }
    })),

  // Close all files in group
  closeAllFiles: (group: EditorGroup) =>
    set(state => {
      // If closing left group and right has files, promote right to left
      if (group === 'left' && state.openFiles.right.files.length > 0) {
        return {
          openFiles: {
            left: { ...state.openFiles.right },
            right: { ...initialEditorGroupState },
            lastFocusedGroup: 'left'
          }
        };
      }

      // Otherwise just clear the group
      return {
        openFiles: {
          ...state.openFiles,
          [group]: { ...initialEditorGroupState }
        }
      };
    }),

  // Split file to right group (open in right)
  splitFileToRight: (fileId: string, name: string) =>
    set(state => {
      const rightHasFile = state.openFiles.right.files.some(f => f.id === fileId);

      if (rightHasFile) {
        // Just activate it
        return {
          openFiles: {
            ...state.openFiles,
            right: {
              ...state.openFiles.right,
              activeFileId: fileId
            },
            lastFocusedGroup: 'right'
          }
        };
      }

      // Add to right group
      return {
        openFiles: {
          ...state.openFiles,
          right: {
            files: [...state.openFiles.right.files, { id: fileId, name }],
            activeFileId: fileId
          },
          lastFocusedGroup: 'right'
        }
      };
    }),

  // Move file from one group to another
  moveFileToGroup: (fileId: string, fromGroup: EditorGroup, toGroup: EditorGroup) =>
    set(state => {
      const fromGroupState = state.openFiles[fromGroup];
      const toGroupState = state.openFiles[toGroup];

      const file = fromGroupState.files.find(f => f.id === fileId);
      if (!file) return state;

      // Check if file already exists in target group
      const existsInTarget = toGroupState.files.some(f => f.id === fileId);
      if (existsInTarget) {
        // Just remove from source and activate in target
        const newFromFiles = fromGroupState.files.filter(f => f.id !== fileId);
        let newFromActiveId = fromGroupState.activeFileId;

        // Handle active file in source group
        if (fromGroupState.activeFileId === fileId) {
          newFromActiveId = newFromFiles.length > 0 ? newFromFiles[0].id : null;
        }

        return {
          openFiles: {
            ...state.openFiles,
            [fromGroup]: {
              files: newFromFiles,
              activeFileId: newFromActiveId
            },
            [toGroup]: {
              ...toGroupState,
              activeFileId: fileId
            },
            lastFocusedGroup: toGroup
          }
        };
      }

      // Remove from source
      const newFromFiles = fromGroupState.files.filter(f => f.id !== fileId);
      let newFromActiveId = fromGroupState.activeFileId;

      // Handle active file in source group
      if (fromGroupState.activeFileId === fileId) {
        newFromActiveId = newFromFiles.length > 0 ? newFromFiles[0].id : null;
      }

      // Add to target
      const newToFiles = [...toGroupState.files, file];

      return {
        openFiles: {
          ...state.openFiles,
          [fromGroup]: {
            files: newFromFiles,
            activeFileId: newFromActiveId
          },
          [toGroup]: {
            files: newToFiles,
            activeFileId: fileId
          },
          lastFocusedGroup: toGroup
        }
      };
    }),

  // Close entire right group
  closeRightGroup: () =>
    set(state => ({
      openFiles: {
        ...state.openFiles,
        right: { ...initialEditorGroupState }
      }
    })),

  // Set last focused group
  setLastFocusedGroup: (group: EditorGroup) =>
    set(state => ({
      openFiles: {
        ...state.openFiles,
        lastFocusedGroup: group
      }
    }))
});
