# Editor & File Explorer Features

## Summary

This document captures all features built for the editor drag-and-drop system and file explorer enhancements. It covers the full changelog, all modified files, implementation details, and architecture notes.

---

## Changelog

### 1. Select Opened Files Toggle

Added a toggle button to sync file tree selection with active editor tabs.

**Files Modified:**
- `src/stores/ui/ui.store.ts` - Added `selectOpenedFiles` state and `toggleSelectOpenedFiles` action
- `src/stores/ui/ui.selector.ts` - Added `useSelectOpenedFiles` hook
- `src/features/files/components/files.component.tsx` - Added toggle button with Crosshair icon
- `src/features/editor/components/editor-tab.component.tsx` - Integrated reveal behavior on tab click

**Behavior:**
- When toggle is ON: Clicking a tab reveals/highlights the file in the file explorer
- When toggle is OFF: Tab clicks don't affect file explorer selection
- When enabling the toggle: Automatically reveals the currently focused file
- Visual indicator: Primary text color when active

**Implementation Details:**
1. UI state stored in Zustand `ui.selectOpenedFiles` boolean
2. Toggle button uses `Crosshair` icon from lucide-react
3. Active state styled with `text-primary` class
4. Auto-reveal on enable uses `useRef` to track previous state and `useEffect` to detect toggle-on

---

### 2. Editor Tab Drag & Drop (dnd-kit)

Full drag-and-drop support for editor tabs within and across groups using @dnd-kit.

**Files Modified:**
- `src/features/editor/components/editor-dnd-context.component.tsx` (NEW) - DnD context provider
- `src/features/editor/components/editor-tabs.component.tsx` - Tab bar with SortableContext
- `src/features/editor/components/editor-tab.component.tsx` - Individual draggable tabs using useSortable
- `src/stores/open-files/open-files.store.ts` - `reorderFile` and `moveFileToGroup` actions
- `src/stores/open-files/open-files.selector.ts` - Action hooks
- `src/features/workspaces/components/workspaces.component.tsx` - Wrapped layout with DnD context

**Features:**
- Drag tabs within same group to reorder
- Drag tabs across groups to move files
- Visual drop indicator (primary-colored vertical line)
- Drag overlay showing file name during drag
- Disabled transform animations during drag for cleaner UX
- End-zone droppable for dropping at end of tab list

**Key Implementation:**
```typescript
// editor-dnd-context.component.tsx
export const EditorDragContext = React.createContext<ActiveDragState | null>(null);

// Tracks: fileId, fileName, fromGroupId, overGroupId, overIndex
// Uses pointerWithin collision detection for accurate drop targeting
```

---

### 3. File Tree Drag to Editor

Drag files from file explorer directly into editor tab bars using native HTML5 drag/drop.

**Files Modified:**
- `src/features/files/components/file-tree.component.tsx` - Drag source with custom MIME type
- `src/features/editor/components/editor-tabs.component.tsx` - Drop target handling

**Implementation:**
- Uses native HTML5 drag/drop with `FILE_TREE_MIME_TYPE` constant (`application/x-file-tree`)
- Calculates drop index based on mouse position relative to tabs (`calculateDropIndex`)
- Shows drop indicator at insertion point
- Opens file at specific position in target group using `openFile(fileId, fileName, groupId, insertIndex)`
- Uses type-safe JSON parsing with validation before using parsed data

**Key Code:**
```typescript
// file-tree.component.tsx - drag start
const handleDragStart = (e: React.DragEvent) => {
  e.dataTransfer.setData(FILE_TREE_MIME_TYPE, JSON.stringify({ fileId: node.id, fileName: node.name }));
  e.dataTransfer.effectAllowed = 'copyMove';
};

// editor-tabs.component.tsx - drop handling with type validation
const handleDrop = (e: React.DragEvent) => {
  const data = e.dataTransfer.getData(FILE_TREE_MIME_TYPE);
  if (data) {
    try {
      const parsed: unknown = JSON.parse(data);
      // Validate parsed data has expected shape
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'fileId' in parsed &&
        'fileName' in parsed &&
        typeof (parsed as { fileId: unknown }).fileId === 'string' &&
        typeof (parsed as { fileName: unknown }).fileName === 'string'
      ) {
        const { fileId, fileName } = parsed as { fileId: string; fileName: string };
        openFile(fileId, fileName, groupId, insertIndex ?? undefined);
      }
    } catch {
      // Invalid JSON, ignore
    }
  }
};
```

---

### 4. Tab Context Menu with Dynamic Move Options

Right-click context menu with intelligent move options based on current layout.

**Files Modified:**
- `src/features/editor/components/editor-tab.component.tsx` - Context menu implementation
- `src/stores/open-files/open-files.selector.ts` - `useCanMoveInDirection` hook
- `src/stores/open-files/open-files.store.ts` - `moveFileToNewGroup` action with direction logic

**Features:**
- Close Tab, Close Others, Close All Tabs
- Dynamic move options: Move/Split Left, Right, Up, Down
- Labels change based on context:
  - "Move Left" when adjacent group exists
  - "Split and Move Left" when creating new group
- Only shows directions that are valid for current layout
- Respects `EDITOR_CONFIG.yGroupLimit` and `xGroupLimit`

**Move Direction Logic:**
```typescript
// useCanMoveInDirection returns { canMove: boolean; isNewGroup: boolean }
// - isNewGroup=true means we're creating a new group/row
// - Can't split if only 1 file in group (nothing left in source)
```

---

### 5. Dynamic Editor Layout (Multi-Row/Group)

Support for multiple rows (vertical) and multiple groups per row (horizontal).

**Files Modified:**
- `src/features/editor/components/editor-layout.component.tsx` - Main layout with vertical ResizablePanelGroup
- `src/features/editor/components/editor-row.component.tsx` - Row with horizontal ResizablePanelGroup
- `src/features/editor/components/editor-group.component.tsx` - Individual editor group (tabs + content)
- `src/features/editor/const.ts` - Configuration constants
- `src/stores/open-files/open-files.store.ts` - Row/group data structures and management
- `src/components/ui/resizable.tsx` - Shadcn resizable panels (installed)

**Data Structures:**
```typescript
type EditorRow = { id: RowId; groups: EditorGroup[] };
type EditorGroup = { id: GroupId; files: OpenFile[]; activeFileId: string | null };
type OpenFilesState = { rows: EditorRow[]; lastFocusedGroupId: GroupId | null };
```

**Features:**
- Multiple horizontal groups per row (split left/right)
- Multiple rows for vertical splits (split up/down)
- Resizable panels using `react-resizable-panels`
- Automatic cleanup of empty groups and rows (`cleanupEmptyGroupsAndRows`)
- Last focused group tracking for intelligent file opening
- Configurable limits via `EDITOR_CONFIG`:
  - `yGroupLimit: 2` - max 2 rows
  - `xGroupLimit: -1` - unlimited horizontal groups

---

### 6. File Explorer Toolbar

Toolbar buttons for file tree management.

**Files Modified:**
- `src/features/files/components/files.component.tsx`

**Buttons (left to right):**
1. **New File** (FilePlus icon) - Create new file at root level
2. **Select Opened Files** (Crosshair icon) - Toggle sync with editor tabs
3. **Expand All** (ChevronsUpDown icon) - Expand all folders recursively
4. **Collapse All** (ChevronsDownUp icon) - Collapse all folders (keep root open)

---

### 7. Reveal File in Explorer

Added `revealFile` action to expand parent folders and select a file.

**Files Modified:**
- `src/stores/files/files.store.ts` - Added `revealFile` action and `findPathToFile` helper
- `src/stores/files/files.selector.ts` - Exposed `revealFile` in action hooks

**Implementation:**
```typescript
revealFile: (fileId: string) => set(state => {
  const path = findPathToFile(state.files.structure, fileId);
  if (!path) return state;
  // Expand all parent folders and select the file
  const newOpenFolderIds = [...state.files.openFolderIds];
  for (const folderId of path) {
    if (!newOpenFolderIds.includes(folderId)) {
      newOpenFolderIds.push(folderId);
    }
  }
  return { files: { ...state.files, selectedId: fileId, openFolderIds: newOpenFolderIds } };
})
```

---

### 8. Bug Fixes

**Runtime Error with openFileIds.has()**
- File: `src/features/files/components/file-tree.component.tsx:66`
- Issue: `openFileIds.has(node.id)` threw TypeError when Set was undefined during re-renders with `useShallow`
- Fix: Added optional chaining `openFileIds?.has(node.id)`

**Reversed Expand/Collapse Icons**
- File: `src/features/files/components/files.component.tsx`
- Issue: `ChevronsDownUp` was incorrectly used for expand, `ChevronsUpDown` for collapse
- Fix: Swapped the icons to match their visual metaphor

---

### 9. CLAUDE.md Compliance & Code Quality Review

A thorough review was conducted to ensure all code follows CLAUDE.md standards and eliminate code smells.

**Files Modified:**
- `src/features/editor/const.ts` - Added constants, removed dead code
- `src/features/editor/components/editor-dnd-context.component.tsx` - Uses `DRAG_ACTIVATION_DISTANCE` constant
- `src/features/editor/components/editor-tabs.component.tsx` - Uses `FILE_TREE_MIME_TYPE`, added JSON validation
- `src/features/editor/components/editor-tab.component.tsx` - Moved `DIRECTION_LABELS` outside component
- `src/features/editor/components/editor-group.component.tsx` - Removed unused props
- `src/features/editor/components/editor-row.component.tsx` - Removed unused props
- `src/features/editor/components/editor-layout.component.tsx` - Removed unused props
- `src/stores/open-files/open-files.selector.ts` - Added useMemo, removed unused hooks
- `src/features/files/components/file-tree-context.tsx` - **NEW** - Context for file tree
- `src/features/files/components/file-tree.component.tsx` - Uses context, simplified props
- `src/features/files/components/files.component.tsx` - Uses FileTreeProvider

**Issues Fixed:**

| Issue | Description | Fix |
|-------|-------------|-----|
| Magic MIME Type String | `'application/x-file-tree'` hardcoded in 3 places | Extracted to `FILE_TREE_MIME_TYPE` constant |
| Magic Number | `8` for drag activation distance | Extracted to `DRAG_ACTIVATION_DISTANCE` constant |
| Unused Props | `rowIndex`/`groupIndex` passed through 5 components | Removed from entire component tree |
| Set Recreation | `useOpenFileIds` created new Set every render | Added `useMemo` to memoize Set creation |
| Object Recreation | `directionLabels` recreated every render | Moved `DIRECTION_LABELS` outside component |
| Unsafe JSON.parse | No type validation after parsing | Added proper type checking before use |
| Dead Code | `DROP_ZONES`, `DropZone`, `useGroupRowIndex`, `useGroupIndexInRow` unused | Removed from codebase |
| Optional Chaining | Inconsistent use on required prop | Fixed in file-tree.component.tsx |
| Prop Drilling | 14 props passed recursively through file tree | Created `FileTreeContext` (reduced to 3 props) |

**Summary:**
- 9 issues fixed
- 11 files modified
- 1 new file created (file-tree-context.tsx)
- Prop drilling reduced from 14 to 3 props
- Build passes with no errors or warnings

---

## All Modified Files

### New Files
| File | Purpose |
|------|---------|
| `src/features/editor/components/editor-dnd-context.component.tsx` | DnD context provider with drag state management |
| `src/features/files/components/file-tree-context.tsx` | FileTree context provider to eliminate prop drilling |
| `FILE.md` | This documentation file |

### Modified UI Components
| File | Changes |
|------|---------|
| `src/components/ui/context-menu.tsx` | Installed Shadcn context menu component |
| `src/components/ui/resizable.tsx` | Installed Shadcn resizable panels component |

### Modified Editor Components
| File | Changes |
|------|---------|
| `src/features/editor/components/editor-layout.component.tsx` | Renders rows with vertical ResizablePanelGroup |
| `src/features/editor/components/editor-row.component.tsx` | Renders groups with horizontal ResizablePanelGroup |
| `src/features/editor/components/editor-tab.component.tsx` | Draggable tab with context menu, reveal integration |
| `src/features/editor/components/editor-tabs.component.tsx` | SortableContext, file tree drop handling, overflow dropdown |
| `src/features/editor/const.ts` | Added `EDITOR_CONFIG`, `MoveDirection` type, `FILE_TREE_MIME_TYPE`, `DRAG_ACTIVATION_DISTANCE` constants |

### Modified Files Components
| File | Changes |
|------|---------|
| `src/features/files/components/file-tree.component.tsx` | Native drag source, uses FileTreeContext (reduced from 14 to 3 props) |
| `src/features/files/components/files.component.tsx` | Toolbar with toggle button, auto-reveal on toggle, FileTreeProvider wrapper |

### Modified Workspaces
| File | Changes |
|------|---------|
| `src/features/workspaces/components/workspaces.component.tsx` | Wrapped with EditorDndContextComponent |

### Modified Stores
| File | Changes |
|------|---------|
| `src/stores/app.store.ts` | Combines all slices (no functional change) |
| `src/stores/ui/ui.store.ts` | Added `selectOpenedFiles` state and toggle action |
| `src/stores/ui/ui.selector.ts` | Added `useSelectOpenedFiles` hook |
| `src/stores/files/files.store.ts` | Added `revealFile` action and `findPathToFile` helper |
| `src/stores/files/files.selector.ts` | Exposed `revealFile` in `useFileActions` |
| `src/stores/open-files/open-files.store.ts` | Complete rewrite for rows/groups, all move/reorder actions |
| `src/stores/open-files/open-files.selector.ts` | Added `useCanMoveInDirection`, row/group selectors, memoized `useOpenFileIds` with useMemo |

### Other
| File | Changes |
|------|---------|
| `CLAUDE.md` | Project documentation (unrelated to this feature) |
| `package-lock.json` | Deleted (npm install will regenerate) |

---

## Architecture Notes

### State Management
- **Zustand** with slice pattern for client state
- Slices: `ui`, `files`, `openFiles`, `typeTabs`
- Selectors in separate `*.selector.ts` files
- `useShallow` for action batching to prevent re-renders

### Drag & Drop Architecture
Two separate systems:

1. **@dnd-kit** for tab-to-tab operations
   - SortableContext for within-group reordering
   - useDroppable for cross-group end zones
   - DragOverlay for visual feedback
   - EditorDragContext for sharing state

2. **Native HTML5 DnD** for file-tree-to-editor
   - Custom MIME type `application/x-file-tree`
   - Prevents conflicts with dnd-kit
   - Simpler implementation for one-way drops

### Key Patterns
1. **Selector hooks** - Components use `useXxx` hooks, never access store directly
2. **Immutable updates** - Always spread state, never mutate
3. **Optional chaining** - Defensive programming for undefined values
4. **Cleanup on close** - `cleanupEmptyGroupsAndRows` removes empty containers
5. **SSR safety** - `isMounted` state prevents hydration mismatches with dnd-kit
6. **No magic values** - All strings/numbers extracted to constants in `const.ts`
7. **Context for prop drilling** - Use React Context when passing 5+ props recursively
8. **Memoization** - Use `useMemo` for expensive operations (React Compiler handles most cases)

### Component Hierarchy
```
Workspaces
└── EditorDndContextComponent (DnD provider)
    └── EditorLayoutComponent (vertical panels)
        └── EditorRowComponent (horizontal panels per row)
            └── EditorGroupComponent (tabs + content)
                └── EditorTabsComponent (tab bar)
                    └── EditorTabComponent (individual tab)
```

---

## Configuration

```typescript
// src/features/editor/const.ts
export const EDITOR_CONFIG = {
  yGroupLimit: 2,    // Max 2 rows (top/bottom)
  xGroupLimit: -1    // Unlimited horizontal groups
};

/** Direction for moving files */
export type MoveDirection = 'left' | 'right' | 'up' | 'down';

/** MIME type for file tree drag and drop */
export const FILE_TREE_MIME_TYPE = 'application/x-file-tree';

/** Minimum drag distance in pixels before drag activates */
export const DRAG_ACTIVATION_DISTANCE = 8;
```

---

## Testing Checklist

- [ ] Drag tab within same group to reorder
- [ ] Drag tab to different group
- [ ] Drag tab to end zone of another group
- [ ] Drag file from tree to empty group
- [ ] Drag file from tree to populated group at specific position
- [ ] Right-click tab → Close Tab
- [ ] Right-click tab → Close Others
- [ ] Right-click tab → Close All Tabs
- [ ] Right-click tab → Move Left/Right (to existing group)
- [ ] Right-click tab → Split and Move Left/Right (create new group)
- [ ] Right-click tab → Move Up/Down (to existing row)
- [ ] Right-click tab → Split and Move Up/Down (create new row)
- [ ] Toggle Select Opened Files → clicking tab reveals in tree
- [ ] Enable toggle → auto-reveals current active file
- [ ] Expand All folders button
- [ ] Collapse All folders button
- [ ] Close all tabs in group → group removed, layout adjusts
- [ ] Close all tabs in row → row removed if empty
