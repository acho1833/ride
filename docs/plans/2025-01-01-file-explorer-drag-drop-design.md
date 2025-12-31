# File Explorer Drag & Drop Design

## Overview

Implement drag and drop functionality within the file explorer to move files and folders between directories, similar to VSCode behavior.

## Requirements

### Core Behavior
- Drag files or folders within the file tree to move them
- Drop onto folders to move inside that folder
- Drop on empty space (below all items) to move to root folder
- Backend `moveNode` API already exists

### Visual Feedback

#### DragOverlay
- Floating preview with file/folder icon + name follows the cursor
- Shows **what** is being dragged
- Source item stays normal (no dimming)

#### Drop Target Highlighting
- When hovering over a valid folder, highlight the **entire folder boundary**:
  - The folder row itself
  - All visible children (files and subfolders) within it
- Creates a visual "container" effect showing **where** the drop will land

### Auto-expand
- Hovering over a collapsed folder for ~700ms triggers auto-expand
- Expands **one level only** (does not recursively expand nested folders)
- Newly revealed children immediately get highlighted

### Edge Scrolling
- Dragging within ~40px of top/bottom edge of scrollable area triggers auto-scroll
- Progressive scroll speed (faster closer to the edge)

### Invalid Drop Targets
Show "not-allowed" cursor and no highlight for:
- The dragged item itself
- Folder's own descendants (prevents circular reference)
- Current parent folder (no-op, item is already there)
- Files (only folders can accept drops)

### Name Conflicts
- If target folder already contains an item with the same name, show confirmation dialog
- Dialog: "A file named 'X' already exists. Replace it?"
- Options: Cancel / Replace

## Technical Approach

### Library
- Use `@dnd-kit/core` (already installed)
- Custom implementation, not `dnd-kit-sortable-tree` package

### Component Changes

#### New: `FileTreeDndContext`
- Wrap file tree in `DndContext` from dnd-kit
- Track active drag state (dragged node id, type, name)
- Track current drop target folder id
- Render `DragOverlay` with file/folder icon + name

#### Update: `FileTreeComponent`
- Add `useDraggable` to each file and folder node
- Add `useDroppable` to folder nodes
- Pass drag state down via context for highlighting

#### Update: `FilesComponent`
- Wrap with DndContext, add root drop zone, edge scroll

#### Update: `FileTreeContext`
- Add drag state to context for highlighting logic

#### New: `MoveConfirmDialogComponent`
- Name conflict confirmation dialog

#### Update: `ScrollArea` (src/components/ui/scroll-area.tsx)
- Add `viewportRef` prop to access viewport for programmatic scrolling

### State Management

#### Drag State (in DndContext)
```typescript
interface DragState {
  activeId: string | null;
  activeNode: TreeNode | null;
  overFolderId: string | null;
}
```

#### Highlight Logic
- Track which folder is the current drop target
- All descendants of that folder get highlighted via CSS
- Use a class or data attribute on the folder subtree container

### Auto-expand Implementation
- On `onDragOver`, start a timer when entering a collapsed folder
- Clear timer when leaving or when folder expands
- After 700ms, call `toggleFolder` to expand
- Only expand the hovered folder, not its children

### Edge Scroll Implementation with shadcn ScrollArea

**Step 1: Extend ScrollArea component**
```typescript
// src/components/ui/scroll-area.tsx
function ScrollArea({
  className,
  children,
  viewportRef,  // NEW: ref to access viewport
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <ScrollAreaPrimitive.Root ...>
      <ScrollAreaPrimitive.Viewport ref={viewportRef} ...>
```

**Step 2: Track drag position and scroll**
```typescript
// In FilesComponent or FileTreeDndContext
const viewportRef = useRef<HTMLDivElement>(null);

// During drag, use requestAnimationFrame loop:
const handleEdgeScroll = (mouseY: number) => {
  const viewport = viewportRef.current;
  if (!viewport) return;

  const rect = viewport.getBoundingClientRect();
  const topZone = rect.top + SCROLL_ZONE_SIZE_PX;
  const bottomZone = rect.bottom - SCROLL_ZONE_SIZE_PX;

  if (mouseY < topZone) {
    // Scroll up - speed proportional to distance from edge
    const distance = topZone - mouseY;
    const speed = Math.min(SCROLL_SPEED_MAX, SCROLL_SPEED_MIN + distance * 0.3);
    viewport.scrollTop -= speed;
  } else if (mouseY > bottomZone) {
    // Scroll down
    const distance = mouseY - bottomZone;
    const speed = Math.min(SCROLL_SPEED_MAX, SCROLL_SPEED_MIN + distance * 0.3);
    viewport.scrollTop += speed;
  }
};
```

**Step 3: Hook into dnd-kit's onDragMove**
```typescript
<DndContext
  onDragMove={(event) => {
    // event.activatorEvent contains mouse coordinates
    const mouseY = (event.activatorEvent as MouseEvent).clientY;
    handleEdgeScroll(mouseY);
  }}
>
```

### Drop Validation
```typescript
function isValidDropTarget(draggedId: string, targetFolderId: string, tree: FolderNode): boolean {
  // Cannot drop on self
  if (draggedId === targetFolderId) return false;

  // Cannot drop on current parent (no-op)
  const currentParent = findParentFolder(tree, draggedId);
  if (currentParent?.id === targetFolderId) return false;

  // Cannot drop folder into its own descendants
  if (isDescendant(tree, draggedId, targetFolderId)) return false;

  return true;
}
```

### Existing Drag-to-Editor Integration
- Keep existing native HTML5 drag for file-tree → editor tabs
- dnd-kit handles intra-tree moves
- Both can coexist: dnd-kit for internal, HTML5 for external drops

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/files/components/file-tree-dnd-context.tsx` | NEW - DndContext wrapper with DragOverlay |
| `src/features/files/components/file-tree.component.tsx` | Add useDraggable, useDroppable, highlight styles |
| `src/features/files/components/files.component.tsx` | Wrap with DndContext, add root drop zone, edge scroll |
| `src/features/files/components/file-tree-context.tsx` | Add drag state to context |
| `src/features/files/components/move-confirm-dialog.component.tsx` | NEW - Name conflict confirmation dialog |
| `src/components/ui/scroll-area.tsx` | Add viewportRef prop |
| `src/features/files/const.ts` | NEW - DnD configuration constants |

## Constants

```typescript
// src/features/files/const.ts
export const FILE_DND_CONFIG = {
  AUTO_EXPAND_DELAY_MS: 700,
  SCROLL_ZONE_SIZE_PX: 40,
  SCROLL_SPEED_MIN: 2,
  SCROLL_SPEED_MAX: 15,
} as const;
```

## Sources
- [shadcn ScrollArea programmatic scroll](https://github.com/radix-ui/primitives/discussions/990)
- [Getting scroll position in ScrollArea](https://github.com/shadcn-ui/ui/discussions/3404)
