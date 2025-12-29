# Editor Split Feature Design

## Overview

Improve the editor splitting feature to work like VSCode - support multiple split directions, unlimited horizontal groups, and drag-and-drop tabs between groups.

## Requirements

### Core Behavior

1. **No duplicate files** - A file can only be open in ONE editor group at a time
2. **Move, not Split** - Moving a tab either joins an existing group or creates a new one
3. **Dynamic groups** - Groups are created on demand and removed when empty

### Layout Structure

- **Vertical (rows):** Maximum 2 levels (top/bottom), configurable via `yGroupLimit`
- **Horizontal (groups):** Unlimited per row, configurable via `xGroupLimit`
- Each row's horizontal splits are independent

```
┌──────┬──────┬──────┬──────┐
│  A   │  B   │  C   │  D   │  ← Top row (4 groups)
├──────┴──────┼──────┴──────┤
│      E      │      F      │  ← Bottom row (2 groups, independent splits)
└─────────────┴─────────────┘
```

### Move Rules

| Action | Behavior |
|--------|----------|
| Move Left | Move to existing left group, OR create new group if leftmost |
| Move Right | Move to existing right group, OR create new group if rightmost |
| Move Up | Move to top row (create if doesn't exist, respects yGroupLimit) |
| Move Down | Move to bottom row (create if doesn't exist, respects yGroupLimit) |

### Context Menu Wording

Dynamic menu based on available groups:

| Scenario | Menu Option |
|----------|-------------|
| Group exists in direction | "Move Left/Right/Up/Down" |
| No group in direction | "Split and Move Left/Right/Up/Down" |

### Constraints

- Must have 2+ tabs in current group to move (can't leave empty group)
- Empty groups are auto-removed
- Empty rows are auto-removed

## Data Model

### Configuration

```typescript
// src/features/editor/const.ts
export const EDITOR_CONFIG = {
  yGroupLimit: 2,   // Max vertical rows (2 = top/bottom only, -1 = unlimited)
  xGroupLimit: -1,  // Max horizontal groups per row (-1 = unlimited)
};
```

### Store Structure

```typescript
type GroupId = string;  // UUID
type RowId = string;    // UUID

type OpenFile = {
  id: string;
  name: string;
};

type EditorGroup = {
  id: GroupId;
  files: OpenFile[];        // Ordered array - position = tab order
  activeFileId: string | null;
};

type EditorRow = {
  id: RowId;
  groups: EditorGroup[];    // Ordered array - position = left-to-right order
};

type OpenFilesState = {
  rows: EditorRow[];        // Ordered array - position = top-to-bottom order
  lastFocusedGroupId: GroupId | null;
};
```

### Store Actions

```typescript
interface OpenFilesActions {
  // File operations
  openFile: (fileId: string, name: string, groupId?: GroupId) => void;
  closeFile: (fileId: string, groupId: GroupId) => void;
  setActiveFile: (fileId: string, groupId: GroupId) => void;

  // Move operations
  moveFileToGroup: (fileId: string, fromGroupId: GroupId, toGroupId: GroupId, insertIndex?: number) => void;
  moveFileToNewGroup: (fileId: string, fromGroupId: GroupId, direction: 'left' | 'right' | 'up' | 'down') => void;

  // Tab reordering (within same group)
  reorderFile: (fileId: string, groupId: GroupId, newIndex: number) => void;

  // Focus
  setLastFocusedGroup: (groupId: GroupId) => void;
  closeAllFilesInGroup: (groupId: GroupId) => void;
}
```

### openFile Behavior

1. Check if file already exists anywhere - if so, just activate it
2. Target group priority: explicit `groupId` → `lastFocusedGroupId` → first group
3. New file goes to END of tab list
4. New file becomes active
5. Group becomes last focused

## Component Structure

### Files to Create/Modify

```
src/features/editor/
├── components/
│   ├── editor-layout.component.tsx      ← REWRITE
│   ├── editor-row.component.tsx         ← NEW
│   ├── editor-group.component.tsx       ← MODIFY
│   ├── editor-tabs.component.tsx        ← MODIFY (sortable)
│   ├── editor-tab.component.tsx         ← MODIFY (draggable + dynamic menu)
│   ├── editor-drop-zone.component.tsx   ← NEW
│   ├── editor-dnd-context.component.tsx ← NEW (DndContext wrapper)
│   └── editor-content.component.tsx     ← NO CHANGE
└── const.ts                             ← NEW

src/stores/open-files/
├── open-files.store.ts                  ← REWRITE
└── open-files.selector.ts               ← REWRITE
```

### Component Hierarchy

```
EditorDndContextComponent (DndContext wrapper)
└── EditorLayoutComponent
    └── ResizablePanelGroup (vertical)
        └── maps over rows[]
            └── EditorRowComponent (per row)
                └── ResizablePanelGroup (horizontal)
                    └── maps over groups[]
                        └── ResizablePanel (per group)
                            └── EditorGroupComponent
                                ├── EditorTabsComponent (SortableContext)
                                │   └── EditorTab (useDraggable)
                                ├── EditorDropZoneComponent (5 useDroppable zones)
                                └── EditorContentComponent
```

## Drag & Drop Implementation

### Library

`@dnd-kit/core` + `@dnd-kit/sortable`

### Setup

```typescript
<DndContext
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  <EditorLayoutComponent />
  <DragOverlay>
    {/* Ghost tab during drag */}
  </DragOverlay>
</DndContext>
```

### Drop Zones

When dragging a tab over an editor group, 5 invisible drop zones appear:

```
┌─────────────────────────────────┐
│            TOP EDGE             │  ← Split and Move Up
├───────┬───────────────┬─────────┤
│ LEFT  │    CENTER     │  RIGHT  │
│ EDGE  │ (join group)  │  EDGE   │
├───────┴───────────────┴─────────┤
│          BOTTOM EDGE            │  ← Split and Move Down
└─────────────────────────────────┘
```

| Zone | Action |
|------|--------|
| Center | Move tab to this group (joins existing tabs) |
| Left edge | Split and Move Left (creates new group to the left) |
| Right edge | Split and Move Right (creates new group to the right) |
| Top edge | Split and Move Up (creates/joins top row) |
| Bottom edge | Split and Move Down (creates/joins bottom row) |

### Drop Zone Availability

Zones respect configuration limits:

- Top/Bottom edges disabled when `yGroupLimit` reached and target row doesn't exist
- Left/Right edges disabled when `xGroupLimit` reached

### Tab Reordering

- Tab bar uses `SortableContext` from `@dnd-kit/sortable`
- Shows vertical line indicator between tabs during drag
- On drop: calls `reorderFile(fileId, groupId, newIndex)`

## Visual Feedback

- Highlighted zone overlay during drag hover (semi-transparent blue)
- Vertical line indicator for tab insertion point
- DragOverlay shows ghost tab following cursor

## Dependencies to Add

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
