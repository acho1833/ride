/**
 * App State Store
 *
 * Main Zustand store that combines all slices.
 * State persists to sessionStorage.
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { IS_DEV } from '@/const';

// Import slices
import { createAppConfigSlice, AppConfigSlice } from './app-config/app-config.store';
import { createUiSlice, UiSlice } from './ui/ui.store';
import { createFileTreeSlice, FileTreeSlice } from './files/files.store';
import { createOpenFilesSlice, OpenFilesSlice } from './open-files/open-files.store';
import { createTypeTabSlice, TypeTabSlice } from '@/stores/type-tabs/type-tabs.store';

// Combined store type
type AppStore = AppConfigSlice & UiSlice & FileTreeSlice & OpenFilesSlice & TypeTabSlice;

/**
 * Main app store with devtools and sessionStorage persistence
 */
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createAppConfigSlice(...a),
        ...createUiSlice(...a),
        ...createFileTreeSlice(...a),
        ...createOpenFilesSlice(...a),
        ...createTypeTabSlice(...a)
      }),
      {
        name: 'app-store',
        storage: createJSONStorage(() => sessionStorage)
      }
    ),
    { name: 'App Store', enabled: IS_DEV }
  )
);
