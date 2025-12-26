/**
 * App State Store
 *
 * Main Zustand store that combines all slices.
 * Persisted to sessionStorage and includes Redux DevTools integration.
 */

import { create } from 'zustand';
import { devtools, createJSONStorage, persist } from 'zustand/middleware';
import { IS_DEV } from '@/const';

// Import slices
import { createUiSlice, UiSlice } from './ui/ui.store';
import { createFileTreeSlice, FileTreeSlice } from './files/files.store';
import { createOpenFilesSlice, OpenFilesSlice } from './open-files/open-files.store';
import { createTypeTabSlice, TypeTabSlice } from '@/stores/type-tabs/type-tabs.store';

// Combined store type
type AppStore = UiSlice & FileTreeSlice & OpenFilesSlice & TypeTabSlice;

/**
 * Main app store with persistence and devtools
 */
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createUiSlice(...a),
        ...createFileTreeSlice(...a),
        ...createOpenFilesSlice(...a),
        ...createTypeTabSlice(...a)
      }),
      {
        name: 'app',
        storage: createJSONStorage(() => sessionStorage)
      }
    ),
    { name: 'App Store', enabled: IS_DEV }
  )
);
