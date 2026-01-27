# Focused Panel Visual Indicator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visual focus indicators to all panels so users can see which panel is currently active, similar to IntelliJ IDEA.

**Architecture:** Add a single `focusedPanel` state in the UI store. Each panel registers click handlers to set focus. Visual styling adapts based on whether `focusedPanel` matches the panel's type. Keep existing `lastFocusedGroupId` for file operations.

**Tech Stack:** Zustand (state), React (components), Tailwind CSS (styling with Shadcn CSS variables)

---

## Task 1: Add Focus State to UI Store

**Files:**
- Modify: `src/stores/ui/ui.store.ts:19-84`

**Step 1: Add FocusedPanelType type after ToolbarPositions**

Find this code at line 23:
```typescript
/** Panel positions where toolbars can be docked */
export type ToolbarPositions = 'left' | 'right' | 'bottom';
```

Add after it:
```typescript
/** Types of panels that can be focused */
export type FocusedPanelType =
  | 'files'
  | 'entity-search'
  | 'charts'
  | 'alerts'
  | 'prompt'
  | `editor-group-${string}`
  | null;
```

**Step 2: Add focusedPanel to UiComponentState**

Find this code at line 26-37:
```typescript
/** UI component state interface */
export interface UiComponentState {
  ui: {
    toggleMode: boolean;
    toolbar: {
      left: ToolType | null;
      right: ToolType | null;
      bottom: ToolType | null;
    };
    /** Whether tab clicks should reveal files in the explorer tree */
    selectOpenedFiles: boolean;
  };
}
```

Replace with:
```typescript
/** UI component state interface */
export interface UiComponentState {
  ui: {
    toggleMode: boolean;
    toolbar: {
      left: ToolType | null;
      right: ToolType | null;
      bottom: ToolType | null;
    };
    /** Whether tab clicks should reveal files in the explorer tree */
    selectOpenedFiles: boolean;
    /** Currently focused panel for visual highlighting */
    focusedPanel: FocusedPanelType;
  };
}
```

**Step 3: Add setFocusedPanel to UiActions**

Find this code at line 39-45:
```typescript
/** UI action methods */
export interface UiActions {
  setToggleMode: (mode: boolean) => void;
  toggleToolbar: (position: ToolbarPositions, toolType: ToolType | null) => void;
  /** Toggle the "Select Opened Files" sync feature */
  toggleSelectOpenedFiles: () => void;
}
```

Replace with:
```typescript
/** UI action methods */
export interface UiActions {
  setToggleMode: (mode: boolean) => void;
  toggleToolbar: (position: ToolbarPositions, toolType: ToolType | null) => void;
  /** Toggle the "Select Opened Files" sync feature */
  toggleSelectOpenedFiles: () => void;
  /** Set the currently focused panel */
  setFocusedPanel: (panel: FocusedPanelType) => void;
}
```

**Step 4: Add initial state and action implementation**

Find this code at line 53-62:
```typescript
export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = set => ({
  ui: {
    toggleMode: false,
    toolbar: {
      left: 'FILES' as ToolType,
      right: 'ALERT' as ToolType,
      bottom: 'CHARTS' as ToolType
    },
    selectOpenedFiles: false
  },
```

Replace with:
```typescript
export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = set => ({
  ui: {
    toggleMode: false,
    toolbar: {
      left: 'FILES' as ToolType,
      right: 'ALERT' as ToolType,
      bottom: 'CHARTS' as ToolType
    },
    selectOpenedFiles: false,
    focusedPanel: null
  },
```

**Step 5: Add setFocusedPanel action implementation**

Find this code at line 80-83:
```typescript
  toggleSelectOpenedFiles: () =>
    set(state => ({
      ui: { ...state.ui, selectOpenedFiles: !state.ui.selectOpenedFiles }
    }))
});
```

Replace with:
```typescript
  toggleSelectOpenedFiles: () =>
    set(state => ({
      ui: { ...state.ui, selectOpenedFiles: !state.ui.selectOpenedFiles }
    })),

  setFocusedPanel: (focusedPanel: FocusedPanelType) =>
    set(state => ({
      ui: { ...state.ui, focusedPanel }
    }))
});
```

**Step 6: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/stores/ui/ui.store.ts
git commit -m "$(cat <<'EOF'
feat(ui): add focusedPanel state to UI store

Add FocusedPanelType and focusedPanel state for tracking which panel
currently has user focus. This enables visual focus indicators similar
to IntelliJ IDEA.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add Focus Selectors

**Files:**
- Modify: `src/stores/ui/ui.selector.ts:1-53`

**Step 1: Update import to include FocusedPanelType**

Find this code at line 14-16:
```typescript
import { useShallow } from 'zustand/react/shallow';
import { UiSlice } from './ui.store';
import { useAppStore } from '@/stores/app.store';
```

Replace with:
```typescript
import { useShallow } from 'zustand/react/shallow';
import { FocusedPanelType, UiSlice } from './ui.store';
import { useAppStore } from '@/stores/app.store';
```

**Step 2: Add focus selectors after useUi selector**

Find this code at line 34-35:
```typescript
/** Get entire UI state object (use sparingly, prefer granular selectors) */
export const useUi = () => useAppStore((state: UiSlice) => state.ui);
```

Add after it:
```typescript
/** Get the currently focused panel */
export const useFocusedPanel = (): FocusedPanelType =>
  useAppStore((state: UiSlice): FocusedPanelType => state.ui.focusedPanel);

/** Check if a specific editor group is focused */
export const useIsEditorGroupFocused = (groupId: string): boolean =>
  useAppStore((state: UiSlice): boolean => state.ui.focusedPanel === `editor-group-${groupId}`);
```

**Step 3: Add setFocusedPanel to useUiActions**

Find this code at line 45-52:
```typescript
export const useUiActions = () =>
  useAppStore(
    useShallow((state: UiSlice) => ({
      setToggleMode: state.setToggleMode,
      toggleToolbar: state.toggleToolbar,
      toggleSelectOpenedFiles: state.toggleSelectOpenedFiles
    }))
  );
```

Replace with:
```typescript
export const useUiActions = () =>
  useAppStore(
    useShallow((state: UiSlice) => ({
      setToggleMode: state.setToggleMode,
      toggleToolbar: state.toggleToolbar,
      toggleSelectOpenedFiles: state.toggleSelectOpenedFiles,
      setFocusedPanel: state.setFocusedPanel
    }))
  );
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/stores/ui/ui.selector.ts
git commit -m "$(cat <<'EOF'
feat(ui): add focus selectors

Add useFocusedPanel and useIsEditorGroupFocused selectors for
components to check panel focus state.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update File Tree Context with Focus State

**Files:**
- Modify: `src/features/files/components/file-tree-context.tsx:36-58`

**Step 1: Add isPanelFocused to context interface**

Find this code at line 36-58:
```typescript
interface FileTreeContextValue {
  /** Currently selected item ID in the tree */
  selectedId: string | null;
  /** Array of folder IDs that are expanded */
  openFolderIds: string[];
  /** Set of file IDs currently open in editor (for visual distinction) */
  openFileIds: Set<string>;
  /** Select a node (highlight it) */
  onSelect: (id: string) => void;
  /** Toggle folder expand/collapse */
  onToggleFolder: (folderId: string) => void;
  /** Context menu actions */
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;

  // Drag state
  /** ID of the node currently being dragged (null if not dragging) */
  draggedNodeId: string | null;
  /** ID of the folder currently being hovered as drop target (null if none) */
  dropTargetFolderId: string | null;
}
```

Replace with:
```typescript
interface FileTreeContextValue {
  /** Currently selected item ID in the tree */
  selectedId: string | null;
  /** Array of folder IDs that are expanded */
  openFolderIds: string[];
  /** Set of file IDs currently open in editor (for visual distinction) */
  openFileIds: Set<string>;
  /** Whether the file explorer panel is currently focused */
  isPanelFocused: boolean;
  /** Select a node (highlight it) */
  onSelect: (id: string) => void;
  /** Toggle folder expand/collapse */
  onToggleFolder: (folderId: string) => void;
  /** Context menu actions */
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;

  // Drag state
  /** ID of the node currently being dragged (null if not dragging) */
  draggedNodeId: string | null;
  /** ID of the folder currently being hovered as drop target (null if none) */
  dropTargetFolderId: string | null;
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: Build fails (expected - FilesComponent not updated yet)

**Step 3: Commit**

```bash
git add src/features/files/components/file-tree-context.tsx
git commit -m "$(cat <<'EOF'
feat(files): add isPanelFocused to file tree context

Prepare context interface for focus-aware styling in file tree.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update Files Component with Focus Handler

**Files:**
- Modify: `src/features/files/components/files.component.tsx:29-248`

**Step 1: Import focus hooks**

Find this code at line 33:
```typescript
import { useSelectOpenedFiles, useUiActions } from '@/stores/ui/ui.selector';
```

Replace with:
```typescript
import { useFocusedPanel, useSelectOpenedFiles, useUiActions } from '@/stores/ui/ui.selector';
```

**Step 2: Add focus state and handler**

Find this code at line 62-63:
```typescript
  // Get UI state and actions
  const selectOpenedFiles = useSelectOpenedFiles();
```

Replace with:
```typescript
  // Get UI state and actions
  const selectOpenedFiles = useSelectOpenedFiles();
  const focusedPanel = useFocusedPanel();
  const isPanelFocused = focusedPanel === 'files';
```

**Step 3: Get setFocusedPanel from useUiActions**

Find this code at line 63:
```typescript
  const { toggleSelectOpenedFiles } = useUiActions();
```

Replace with:
```typescript
  const { toggleSelectOpenedFiles, setFocusedPanel } = useUiActions();
```

**Step 4: Add isPanelFocused to context value**

Find this code at line 236-248:
```typescript
  // Context value for FileTreeProvider - React Compiler handles memoization
  const fileTreeContextValue = {
    selectedId,
    openFolderIds,
    openFileIds,
    onSelect: setSelectedFileId,
    onToggleFolder: toggleFolder,
    onAddFile: handleAddFile,
    onAddFolder: handleAddFolder,
    onRename: handleStartRename,
    onDelete: handleStartDelete,
    draggedNodeId,
    dropTargetFolderId
  };
```

Replace with:
```typescript
  // Context value for FileTreeProvider - React Compiler handles memoization
  const fileTreeContextValue = {
    selectedId,
    openFolderIds,
    openFileIds,
    isPanelFocused,
    onSelect: setSelectedFileId,
    onToggleFolder: toggleFolder,
    onAddFile: handleAddFile,
    onAddFolder: handleAddFolder,
    onRename: handleStartRename,
    onDelete: handleStartDelete,
    draggedNodeId,
    dropTargetFolderId
  };
```

**Step 5: Add click handler to set focus**

Find this code at line 293-294:
```typescript
              <ScrollArea className="h-full" type="hover" viewportRef={viewportRef}>
                <div ref={setEmptyDropRef} className="min-h-full" onContextMenu={handleEmptySpaceContextMenu}>
```

Replace with:
```typescript
              <ScrollArea className="h-full" type="hover" viewportRef={viewportRef}>
                <div
                  ref={setEmptyDropRef}
                  className="min-h-full"
                  onContextMenu={handleEmptySpaceContextMenu}
                  onClick={() => setFocusedPanel('files')}
                >
```

**Step 6: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/features/files/components/files.component.tsx
git commit -m "$(cat <<'EOF'
feat(files): add focus handling to file explorer

Set focusedPanel to 'files' when clicking the file explorer panel.
Pass isPanelFocused to context for child components.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update File Tree Component with Focus-Aware Styling

**Files:**
- Modify: `src/features/files/components/file-tree.component.tsx:66-196`

**Step 1: Get isPanelFocused from context**

Find this code at line 66-78:
```typescript
  const {
    selectedId,
    openFolderIds,
    openFileIds,
    onSelect,
    onToggleFolder,
    onAddFile,
    onAddFolder,
    onRename,
    onDelete,
    draggedNodeId,
    dropTargetFolderId
  } = useFileTreeContext();
```

Replace with:
```typescript
  const {
    selectedId,
    openFolderIds,
    openFileIds,
    isPanelFocused,
    onSelect,
    onToggleFolder,
    onAddFile,
    onAddFolder,
    onRename,
    onDelete,
    draggedNodeId,
    dropTargetFolderId
  } = useFileTreeContext();
```

**Step 2: Create selection class helper**

Find this code at line 130-132:
```typescript
  // Styling classes for drag state
  const highlightClass = shouldHighlight && !isDragging ? 'bg-accent/50' : '';
  const draggingClass = isDndKitDragging ? 'opacity-50' : '';
```

Replace with:
```typescript
  // Styling classes for drag state
  const highlightClass = shouldHighlight && !isDragging ? 'bg-accent/50' : '';
  const draggingClass = isDndKitDragging ? 'opacity-50' : '';

  // Selection styling based on panel focus
  const getSelectionClass = (isSelected: boolean) => {
    if (!isSelected) return '';
    return isPanelFocused ? 'bg-primary text-primary-foreground' : 'bg-muted';
  };
```

**Step 3: Update file node styling**

Find this code at line 154-156:
```typescript
            className={`hover:bg-accent flex cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 transition-colors ${
              selectedId === node.id ? 'bg-accent' : ''
            } ${highlightClass} ${draggingClass}`}
```

Replace with:
```typescript
            className={`flex cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 transition-colors ${
              selectedId === node.id ? '' : 'hover:bg-accent'
            } ${getSelectionClass(selectedId === node.id)} ${highlightClass} ${draggingClass}`}
```

**Step 4: Update folder node styling**

Find this code at line 194-196:
```typescript
              className={`hover:bg-accent flex w-full cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
                selectedId === node.id ? 'bg-accent' : ''
              } ${draggingClass}`}
```

Replace with:
```typescript
              className={`flex w-full cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors ${
                selectedId === node.id ? '' : 'hover:bg-accent'
              } ${getSelectionClass(selectedId === node.id)} ${draggingClass}`}
```

**Step 5: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/features/files/components/file-tree.component.tsx
git commit -m "$(cat <<'EOF'
feat(files): add focus-aware selection styling

When file explorer is focused, selected items use bg-primary.
When unfocused, selected items use bg-muted.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update Editor Group Component with Focus Handler

**Files:**
- Modify: `src/features/editor/components/editor-group.component.tsx:25-59`

**Step 1: Import focus action**

Find this code at line 25:
```typescript
import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
```

Replace with:
```typescript
import { useEditorGroup, useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import { useUiActions } from '@/stores/ui/ui.selector';
```

**Step 2: Get setFocusedPanel action**

Find this code at line 36-37:
```typescript
  const group = useEditorGroup(groupId);
  const { setLastFocusedGroup } = useOpenFilesActions();
```

Replace with:
```typescript
  const group = useEditorGroup(groupId);
  const { setLastFocusedGroup } = useOpenFilesActions();
  const { setFocusedPanel } = useUiActions();
```

**Step 3: Update handleFocus to also set focusedPanel**

Find this code at line 51-55:
```typescript
  // Track which group user last interacted with.
  // Used by openFile() to determine default target when no group specified.
  const handleFocus = () => {
    setLastFocusedGroup(groupId);
  };
```

Replace with:
```typescript
  // Track which group user last interacted with.
  // Used by openFile() to determine default target when no group specified.
  // Also sets focusedPanel for visual highlighting.
  const handleFocus = () => {
    setLastFocusedGroup(groupId);
    setFocusedPanel(`editor-group-${groupId}`);
  };
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/editor/components/editor-group.component.tsx
git commit -m "$(cat <<'EOF'
feat(editor): set focusedPanel when editor group is focused

When user clicks/focuses an editor group, update focusedPanel to
enable visual highlighting of the active group.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update Editor Tab Component to Use focusedPanel

**Files:**
- Modify: `src/features/editor/components/editor-tab.component.tsx:33-151`

**Step 1: Import useIsEditorGroupFocused**

Find this code at line 33:
```typescript
import { useOpenFilesActions, useCanMoveInDirection, useLastFocusedGroupId } from '@/stores/open-files/open-files.selector';
```

Replace with:
```typescript
import { useOpenFilesActions, useCanMoveInDirection } from '@/stores/open-files/open-files.selector';
import { useIsEditorGroupFocused } from '@/stores/ui/ui.selector';
```

**Step 2: Replace lastFocusedGroupId with useIsEditorGroupFocused**

Find this code at line 69-71:
```typescript
  const lastFocusedGroupId = useLastFocusedGroupId();
  // Visual distinction: Active tab in the focused group gets a top highlight bar
  const isLastFocusedGroup = lastFocusedGroupId === groupId;
```

Replace with:
```typescript
  // Visual distinction: Active tab in the focused group gets a top highlight bar
  const isGroupFocused = useIsEditorGroupFocused(groupId);
```

**Step 3: Update className to use isGroupFocused**

Find this code at line 151:
```typescript
            isActive && isLastFocusedGroup ? 'border-t-primary border-t-4' : 'border-t-4 border-t-transparent',
```

Replace with:
```typescript
            isActive && isGroupFocused ? 'border-t-primary border-t-4' : 'border-t-4 border-t-transparent',
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/editor/components/editor-tab.component.tsx
git commit -m "$(cat <<'EOF'
feat(editor): use focusedPanel for tab highlight instead of lastFocusedGroupId

This separates visual focus (focusedPanel) from operational focus
(lastFocusedGroupId for file operations).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update Left Toolbar with Focus-Based Icon Highlighting

**Files:**
- Modify: `src/features/toolbars/components/left-toolbar.component.tsx:1-113`

**Step 1: Import focus selector**

Find this code at line 8:
```typescript
import { useUiActions } from '@/stores/ui/ui.selector';
```

Replace with:
```typescript
import { useFocusedPanel, useUiActions } from '@/stores/ui/ui.selector';
import { FocusedPanelType } from '@/stores/ui/ui.store';
```

**Step 2: Add mapping from ToolType to FocusedPanelType**

Find this code at line 38-42:
```typescript
interface Props {
  activeToolTypes: (ToolType | null)[];
}
```

Replace with:
```typescript
/** Map ToolType to FocusedPanelType for icon highlighting */
const TOOL_TYPE_TO_FOCUS_PANEL: Record<ToolType, FocusedPanelType> = {
  FILES: 'files',
  ENTITY_SEARCH: 'entity-search',
  CHARTS: 'charts',
  PROMPT: 'prompt',
  ALERT: 'alerts'
};

interface Props {
  activeToolTypes: (ToolType | null)[];
}
```

**Step 3: Get focusedPanel state**

Find this code at line 45-46:
```typescript
  const { toggleToolbar } = useUiActions();
  const viewSettings = useViewSettings()!;
```

Replace with:
```typescript
  const { toggleToolbar } = useUiActions();
  const viewSettings = useViewSettings()!;
  const focusedPanel = useFocusedPanel();
```

**Step 4: Update top tools button styling**

Find this code at line 77-84:
```typescript
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLeftToolbar(tool.type)}
                className={cn(activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50')}
              >
                <tool.icon className="size-5" />
              </Button>
```

Replace with:
```typescript
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLeftToolbar(tool.type)}
                className={cn(
                  activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50',
                  focusedPanel === TOOL_TYPE_TO_FOCUS_PANEL[tool.type] && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <tool.icon className="size-5" />
              </Button>
```

**Step 5: Update bottom tools button styling**

Find this code at line 95-102:
```typescript
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleBottomToolbar(tool.type)}
                  className={cn(activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50')}
                >
                  <tool.icon className="size-5" />
                </Button>
```

Replace with:
```typescript
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleBottomToolbar(tool.type)}
                  className={cn(
                    activeToolTypes.includes(tool.type) && 'bg-input dark:hover:bg-input/50',
                    focusedPanel === TOOL_TYPE_TO_FOCUS_PANEL[tool.type] && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  <tool.icon className="size-5" />
                </Button>
```

**Step 6: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/features/toolbars/components/left-toolbar.component.tsx
git commit -m "$(cat <<'EOF'
feat(toolbar): highlight sidebar icons based on focusedPanel

When a panel is focused, its corresponding sidebar icon shows
bg-primary styling to indicate which panel has user attention.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Update Right Toolbar with Focus-Based Icon Highlighting

**Files:**
- Modify: `src/features/toolbars/components/right-toolbar.component.tsx:1-63`

**Step 1: Import focus selector**

Find this code at line 8:
```typescript
import { useUiActions } from '@/stores/ui/ui.selector';
```

Replace with:
```typescript
import { useFocusedPanel, useUiActions } from '@/stores/ui/ui.selector';
import { FocusedPanelType } from '@/stores/ui/ui.store';
```

**Step 2: Add mapping from ToolType to FocusedPanelType**

Find this code at line 18-22:
```typescript
];

interface Props {
  activeToolType: ToolType | null;
}
```

Replace with:
```typescript
];

/** Map ToolType to FocusedPanelType for icon highlighting */
const TOOL_TYPE_TO_FOCUS_PANEL: Record<ToolType, FocusedPanelType> = {
  FILES: 'files',
  ENTITY_SEARCH: 'entity-search',
  CHARTS: 'charts',
  PROMPT: 'prompt',
  ALERT: 'alerts'
};

interface Props {
  activeToolType: ToolType | null;
}
```

**Step 3: Get focusedPanel state**

Find this code at line 25-26:
```typescript
  const { toggleToolbar } = useUiActions();
  const viewSettings = useViewSettings()!;
```

Replace with:
```typescript
  const { toggleToolbar } = useUiActions();
  const viewSettings = useViewSettings()!;
  const focusedPanel = useFocusedPanel();
```

**Step 4: Update button styling**

Find this code at line 48-54:
```typescript
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleRightToolbar(tool.type)}
              className={cn(activeToolType === tool.type && 'bg-input dark:hover:bg-input/50')}
            >
              <tool.icon className="size-5" />
            </Button>
```

Replace with:
```typescript
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleRightToolbar(tool.type)}
              className={cn(
                activeToolType === tool.type && 'bg-input dark:hover:bg-input/50',
                focusedPanel === TOOL_TYPE_TO_FOCUS_PANEL[tool.type] && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <tool.icon className="size-5" />
            </Button>
```

**Step 5: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/features/toolbars/components/right-toolbar.component.tsx
git commit -m "$(cat <<'EOF'
feat(toolbar): highlight right sidebar icons based on focusedPanel

Consistent with left toolbar - focused panel's icon shows bg-primary.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Add Focus Handlers to Entity Search Panel

**Files:**
- Modify: `src/features/entity-search/components/entity-search.component.tsx:1-106`

**Step 1: Import focus action**

Find this code at line 4-5:
```typescript
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ToolbarPositions } from '@/stores/ui/ui.store';
```

Replace with:
```typescript
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { ToolbarPositions } from '@/stores/ui/ui.store';
import { useUiActions } from '@/stores/ui/ui.selector';
```

**Step 2: Get setFocusedPanel action**

Find this code at line 40-41:
```typescript
const EntitySearchComponent = ({ pos }: Props) => {
  // All search-related state in single object
```

Replace with:
```typescript
const EntitySearchComponent = ({ pos }: Props) => {
  const { setFocusedPanel } = useUiActions();

  // All search-related state in single object
```

**Step 3: Add click handler to main container**

Find this code at line 77-78:
```typescript
    <MainPanelsComponent title="Entity Search" pos={pos}>
      <div className="flex h-full flex-col gap-y-2">
```

Replace with:
```typescript
    <MainPanelsComponent title="Entity Search" pos={pos}>
      <div className="flex h-full flex-col gap-y-2" onClick={() => setFocusedPanel('entity-search')}>
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/entity-search/components/entity-search.component.tsx
git commit -m "$(cat <<'EOF'
feat(entity-search): add focus handling

Set focusedPanel to 'entity-search' when clicking the panel.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Add Focus Handlers to Notifications Panel

**Files:**
- Modify: `src/features/notifications/components/notifications.component.tsx:1-17`

**Step 1: Add 'use client' and import focus action**

Find this code at line 1-2:
```typescript
import { ToolbarPositions } from '@/stores/ui/ui.store';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
```

Replace with:
```typescript
'use client';

import { ToolbarPositions } from '@/stores/ui/ui.store';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { useUiActions } from '@/stores/ui/ui.selector';
```

**Step 2: Get setFocusedPanel and add click handler**

Find this code at line 8-17:
```typescript
const NotificationsComponent = ({ pos }: Props) => {
  return (
    <MainPanelsComponent title="Notifications" pos={pos}>
      <div>Notifications 1</div>
      <div>Notifications 2</div>
    </MainPanelsComponent>
  );
};

export default NotificationsComponent;
```

Replace with:
```typescript
const NotificationsComponent = ({ pos }: Props) => {
  const { setFocusedPanel } = useUiActions();

  return (
    <MainPanelsComponent title="Notifications" pos={pos}>
      <div className="h-full" onClick={() => setFocusedPanel('alerts')}>
        <div>Notifications 1</div>
        <div>Notifications 2</div>
      </div>
    </MainPanelsComponent>
  );
};

export default NotificationsComponent;
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/features/notifications/components/notifications.component.tsx
git commit -m "$(cat <<'EOF'
feat(notifications): add focus handling

Set focusedPanel to 'alerts' when clicking the panel.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Add Focus Handlers to Prompts Panel

**Files:**
- Modify: `src/features/prompts/components/prompts.component.tsx:25-114`

**Step 1: Import focus action**

Find this code at line 6:
```typescript
import { Button } from '@/components/ui/button';
```

Replace with:
```typescript
import { Button } from '@/components/ui/button';
import { useUiActions } from '@/stores/ui/ui.selector';
```

**Step 2: Get setFocusedPanel action**

Find this code at line 25-26:
```typescript
const PromptsComponent = ({ pos }: Props) => {
  const [messages, setMessages] = useState<Message[]>([
```

Replace with:
```typescript
const PromptsComponent = ({ pos }: Props) => {
  const { setFocusedPanel } = useUiActions();

  const [messages, setMessages] = useState<Message[]>([
```

**Step 3: Add click handler to main container**

Find this code at line 113-114:
```typescript
    <MainPanelsComponent title="AI Prompts" pos={pos}>
      <div className="bg-background flex h-full flex-col">
```

Replace with:
```typescript
    <MainPanelsComponent title="AI Prompts" pos={pos}>
      <div className="bg-background flex h-full flex-col" onClick={() => setFocusedPanel('prompt')}>
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/prompts/components/prompts.component.tsx
git commit -m "$(cat <<'EOF'
feat(prompts): add focus handling

Set focusedPanel to 'prompt' when clicking the panel.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Add Focus Handlers to Charts Panel

**Files:**
- Modify: `src/features/type-tabs/components/type-tab-container.component.tsx:10-50`

**Step 1: Import focus action**

Find this code at line 13:
```typescript
import { useChartActiveTab } from '@/stores/type-tabs/type-tabs.selector';
```

Replace with:
```typescript
import { useChartActiveTab } from '@/stores/type-tabs/type-tabs.selector';
import { useUiActions } from '@/stores/ui/ui.selector';
```

**Step 2: Get setFocusedPanel action**

Find this code at line 22-23:
```typescript
const TypeTabContainer = ({ pos }: Props) => {
  const activeTab = useChartActiveTab();
```

Replace with:
```typescript
const TypeTabContainer = ({ pos }: Props) => {
  const activeTab = useChartActiveTab();
  const { setFocusedPanel } = useUiActions();
```

**Step 3: Add click handler to main container**

Find this code at line 26-27:
```typescript
    <MainPanelsComponent title="Charts" pos={pos}>
      <div className="flex h-full flex-col">
```

Replace with:
```typescript
    <MainPanelsComponent title="Charts" pos={pos}>
      <div className="flex h-full flex-col" onClick={() => setFocusedPanel('charts')}>
```

**Step 4: Run build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/type-tabs/components/type-tab-container.component.tsx
git commit -m "$(cat <<'EOF'
feat(charts): add focus handling

Set focusedPanel to 'charts' when clicking the panel.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Final Build and Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No linting errors

**Step 3: Manual Testing Checklist**

Start the dev server: `npm run dev`

Test each scenario:

1. **File Explorer Focus**
   - Click on File Explorer panel
   - Verify: Folder icon in sidebar shows `bg-primary` (blue/primary color)
   - Verify: Selected file/folder shows `bg-primary text-primary-foreground`

2. **Editor Group Focus**
   - Click on an editor tab group
   - Verify: Folder icon loses `bg-primary` highlight
   - Verify: Active tab in clicked group shows `border-t-primary` top bar
   - Verify: Other group's active tabs do NOT show top bar

3. **Charts Panel Focus**
   - Click on Charts panel
   - Verify: Chart icon in sidebar shows `bg-primary`
   - Verify: Editor tabs lose top bar highlight
   - Verify: File explorer selection becomes muted (`bg-muted`)

4. **Entity Search Focus**
   - Click on Entity Search panel
   - Verify: Search icon shows `bg-primary`

5. **Notifications Focus**
   - Click on Notifications panel
   - Verify: Bell icon shows `bg-primary`

6. **Prompts Focus**
   - Click on Prompts panel
   - Verify: Bot icon shows `bg-primary`

7. **File Operations Still Work**
   - With Charts panel focused, double-click a file in File Explorer
   - Verify: File opens in the correct editor group (per lastFocusedGroupId)

**Step 4: Commit all changes**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: implement focused panel visual indicators

Add visual focus tracking across all panels (File Explorer, Editor Groups,
Charts, Entity Search, Notifications, Prompts) similar to IntelliJ IDEA.

- Focused panel's sidebar icon shows bg-primary highlight
- File Explorer selection uses bg-primary when focused, bg-muted when not
- Editor tab groups show border-t-primary on active tab when focused
- Separate focusedPanel (visual) from lastFocusedGroupId (operational)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `src/stores/ui/ui.store.ts` | Add FocusedPanelType, focusedPanel state, setFocusedPanel action |
| `src/stores/ui/ui.selector.ts` | Add useFocusedPanel, useIsEditorGroupFocused selectors |
| `src/features/files/components/file-tree-context.tsx` | Add isPanelFocused to context interface |
| `src/features/files/components/files.component.tsx` | Add focus handler, pass isPanelFocused to context |
| `src/features/files/components/file-tree.component.tsx` | Use focus-aware selection styling |
| `src/features/editor/components/editor-group.component.tsx` | Set focusedPanel on group focus |
| `src/features/editor/components/editor-tab.component.tsx` | Use useIsEditorGroupFocused instead of lastFocusedGroupId |
| `src/features/toolbars/components/left-toolbar.component.tsx` | Add focus-based icon highlighting |
| `src/features/toolbars/components/right-toolbar.component.tsx` | Add focus-based icon highlighting |
| `src/features/entity-search/components/entity-search.component.tsx` | Add focus handler |
| `src/features/notifications/components/notifications.component.tsx` | Add focus handler |
| `src/features/prompts/components/prompts.component.tsx` | Add focus handler |
| `src/features/type-tabs/components/type-tab-container.component.tsx` | Add focus handler |
