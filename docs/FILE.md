# File System PRD

Product Requirements Document for all file-related features in the application.

---

## Overview

The file system provides a complete file management experience with a file explorer sidebar and a multi-pane editor. Users can browse files in a tree structure, open files in tabbed editor groups, and organize their workspace with drag-and-drop and split views.

**Key Components:**
- **File Explorer** - Hierarchical tree view for browsing and managing files
- **Editor Layout** - Multi-row, multi-group editor with resizable panels
- **Editor Tabs** - Tab-based file navigation within each group
- **Drag & Drop** - Reorder tabs and move files between groups

---

## 1. File Explorer

### 1.1 File Tree Navigation

**Description:** A hierarchical tree view displaying the project's file and folder structure.

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Click file | Select file (highlight) |
| Double-click file | Open file in last-focused editor group |
| Click folder | Select folder (highlight) |
| Click chevron | Toggle folder expand/collapse |
| Double-click folder | Toggle folder expand/collapse |

**Initial State:**
- First file is pre-selected on app load

**Visual States:**
- **Selected item:** Background highlight (`bg-accent`)
- **Open file indicator:** File icon colored (`text-primary fill-primary/20`)
- **Expanded folder:** Down chevron icon
- **Collapsed folder:** Right chevron icon

---

### 1.2 Create Files and Folders

**Description:** Create new files or folders at any location in the tree.

**User Interactions:**
| Action | Location | Behavior |
|--------|----------|----------|
| Click "New File" toolbar button | Root folder | Creates file at root |
| Right-click folder → "New File" | Target folder | Creates file in folder |
| Right-click folder → "New Folder" | Target folder | Creates folder in folder |

**Creation Flow:**
1. Parent folder auto-expands if collapsed
2. Inline input field appears at the target location
3. User types name and presses Enter to confirm
4. Press Escape or blur with empty name to cancel

**Input Field Behavior:**
- Auto-focused on appear
- Placeholder: "filename.ext" (file) or "folder name" (folder)
- Displays appropriate icon (file or folder)

---

### 1.3 Rename Files and Folders

**Description:** Rename any file or folder in the tree.

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Right-click item → "Rename" | Enter inline edit mode |
| Press Enter | Confirm new name |
| Press Escape | Cancel rename |
| Blur with empty name | Cancel rename |

**Rename Flow:**
1. Text becomes editable inline input
2. Current name is pre-filled and selected
3. Confirm or cancel as described above

---

### 1.4 Delete Files and Folders

**Description:** Remove files or folders from the tree.

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Right-click item → "Delete" | Remove item from tree |

**Constraints:**
- Root folder cannot be deleted
- If deleted item was selected, selection is cleared

---

### 1.5 Expand and Collapse All

**Description:** Quickly expand or collapse all folders in the tree.

**Toolbar Buttons:**
| Button | Icon | Behavior |
|--------|------|----------|
| Expand All | ChevronsUpDown | Opens all folders recursively |
| Collapse All | ChevronsDownUp | Closes all folders (root remains visible) |

---

### 1.6 Drag File to Editor

**Description:** Drag files from the file explorer directly into editor tab bars.

**User Interactions:**
1. Start dragging a file from the tree
2. Drag over any editor group's tab bar
3. Drop indicator shows insertion position
4. Release to open file at that position

**Behavior:**
- Only files can be dragged (not folders)
- Drop indicator appears as a vertical line between tabs
- File opens at the exact drop position
- Works with empty groups ("Drop files here" placeholder)

---

## 2. Editor Layout

### 2.1 Multi-Row Layout

**Description:** The editor supports multiple horizontal rows for vertical split views.

**Structure:**
```
┌─────────────────────────────────┐
│           Row 1                 │
│  ┌─────────┬─────────┬───────┐  │
│  │ Group 1 │ Group 2 │ ... N │  │
│  └─────────┴─────────┴───────┘  │
├─────────────────────────────────┤  ← Resize Handle
│           Row 2                 │
│  ┌─────────┬─────────┐          │
│  │ Group 1 │ Group 2 │          │
│  └─────────┴─────────┘          │
└─────────────────────────────────┘
```

**Configuration:**
- Maximum rows: 2 (`yGroupLimit`)
- Maximum groups per row: Unlimited (`xGroupLimit: -1`)

---

### 2.2 Resizable Panels

**Description:** Rows and groups can be resized by dragging handles.

**User Interactions:**
| Handle | Direction | Behavior |
|--------|-----------|----------|
| Between rows | Vertical | Adjust row heights |
| Between groups | Horizontal | Adjust group widths |

**Constraints:**
- Minimum panel size: 15%
- Panels maintain proportions on window resize

---

### 2.3 Group Focus Tracking

**Description:** The system tracks which editor group was last focused.

**Behavior:**
- Clicking in a group or its tabs sets it as "last focused"
- Opening a file without specifying a group uses the last-focused group
- Visual indicator: Active tab in focused group shows top border bar

---

### 2.4 Automatic Cleanup

**Description:** Empty groups and rows are automatically removed.

**Triggers:**
- Closing the last file in a group
- Moving the last file out of a group

**Behavior:**
- Empty groups are removed from their row
- Empty rows are removed from the layout
- At least one row with one group is always maintained
- If the focused group is cleaned up, focus transfers to the first available group

---

## 3. Editor Tabs

### 3.1 Tab Display

**Description:** Each editor group displays open files as horizontal tabs.

**Tab States:**
| State | Appearance |
|-------|------------|
| Active tab | `bg-secondary`, normal text |
| Inactive tab | `bg-muted/50`, muted text |
| Hovered tab | Slightly darker background |
| Dragging tab | 50% opacity |

**Visual Elements:**
- File name (truncated if too long)
- Close button (X) - visible on hover or when active
- Active indicator (top border bar on focused group)
- Drop indicator (vertical line during drag)

---

### 3.2 Open File

**Description:** Open a file in an editor group.

**Triggers:**
| Action | Target Group |
|--------|--------------|
| Double-click in file tree | Last-focused group |
| Drag from file tree | Target group (at drop position) |
| Context menu "Move" | Target group |

**Behavior:**
- If file already open in any group → activate existing tab
- If new file → add tab to target group
- Can specify insertion index for precise positioning

---

### 3.3 Close File

**Description:** Close a single file tab.

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Click X button on tab | Close that file |
| Middle-click tab | Close that file |
| Right-click → "Close Tab" | Close that file |

**Behavior:**
- If closing active tab → activate adjacent tab (next or previous)
- If last file in group → trigger cleanup

---

### 3.4 Close Other Files

**Description:** Close all tabs except the selected one.

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Right-click tab → "Close Others" | Close all other tabs in group |

---

### 3.5 Close All Files

**Description:** Close all tabs in a group.

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Right-click tab → "Close All Tabs" | Close all tabs in group |
| Overflow menu → "Close All Tabs" | Close all tabs in group |

---

### 3.6 Tab Overflow

**Description:** When tabs exceed available width, an overflow menu appears.

**Behavior:**
- Tabs scroll horizontally within the container
- Dropdown button (chevron) appears at the right edge
- Dropdown menu lists all open files in the group
- Click item in dropdown to activate that file
- "Close All Tabs" option at bottom of menu

---

## 4. Drag & Drop

### 4.1 Reorder Tabs (Within Group)

**Description:** Drag tabs to reorder them within the same group.

**User Interactions:**
1. Click and hold a tab
2. Drag after 8px of movement (activation threshold)
3. Drop indicator shows new position
4. Release to reorder

**Visual Feedback:**
- Dragged tab becomes semi-transparent (50% opacity)
- Drop indicator (vertical primary-color line) shows insertion point
- Drag overlay shows file name in a floating pill (`bg-secondary` with border)

**Drop Position Calculation:**
- System compares mouse X position to tab midpoints
- Drop indicator appears before the tab whose midpoint is to the right of cursor
- Dropping at end of tab bar appends file to group

---

### 4.2 Move Tab (Between Groups)

**Description:** Drag tabs from one group to another.

**User Interactions:**
1. Click and hold a tab
2. Drag to another group's tab bar
3. Drop indicator shows insertion position
4. Release to move file

**Behavior:**
- File is removed from source group
- File is added to target group at drop position
- Source group triggers cleanup if now empty

---

### 4.3 Move/Split via Context Menu

**Description:** Move files to adjacent groups or create new splits.

**Context Menu Options:**
| Option | Condition | Behavior |
|--------|-----------|----------|
| Move Left | Adjacent group exists | Move to left group |
| Split and Move Left | No left group, multiple files | Create new group, move file |
| Move Right | Adjacent group exists | Move to right group |
| Split and Move Right | No right group, multiple files | Create new group, move file |
| Move Up | Row above exists | Move to row above |
| Split and Move Up | No row above, multiple files | Create new row, move file |
| Move Down | Row below exists | Move to row below |
| Split and Move Down | No row below, multiple files | Create new row, move file |

**Constraints:**
- Cannot split single-file groups (source group would be empty after move)
- Respects `yGroupLimit` (max 2 rows)
- Respects `xGroupLimit` (unlimited horizontal)

**Split vs Move Logic:**
- **Move**: Target group/row already exists - file moves to existing location
- **Split**: No target group/row exists - creates new group/row and moves file there
- Split requires 2+ files in source group (otherwise nothing remains in source)

---

## 5. Sync Features

### 5.1 Select Opened Files Toggle

**Description:** Sync file tree selection with active editor tab.

**Location:** File explorer toolbar (Crosshair icon)

**States:**
| State | Indicator | Behavior |
|-------|-----------|----------|
| OFF | Normal icon | Tab clicks don't affect tree |
| ON | Primary color icon | Tab clicks reveal file in tree |

---

### 5.2 Reveal File in Tree

**Description:** Expand parent folders and select a file in the tree.

**Triggers:**
- Click tab while "Select Opened Files" is ON
- Enable "Select Opened Files" toggle (auto-reveals current file)

**Behavior:**
1. Find path from root to target file
2. Expand all parent folders
3. Select the target file (highlight)

---

## 6. Context Menus

### 6.1 File Tree Context Menu (File)

| Option | Behavior |
|--------|----------|
| Rename | Enter inline rename mode |
| Delete | Remove file from tree |

### 6.2 File Tree Context Menu (Folder)

| Option | Behavior |
|--------|----------|
| New File | Create file in this folder |
| New Folder | Create folder in this folder |
| Rename | Enter inline rename mode |
| Delete | Remove folder and contents (not available on root) |

### 6.3 Editor Tab Context Menu

| Option | Behavior |
|--------|----------|
| Close Tab | Close this file |
| Close Others | Close all other files in group |
| Close All Tabs | Close all files in group |
| Move/Split Left | Move file left (conditional) |
| Move/Split Right | Move file right (conditional) |
| Move/Split Up | Move file up (conditional) |
| Move/Split Down | Move file down (conditional) |

---

## 7. Data Persistence

### 7.1 Session Storage

**Description:** State persists during the browser session.

**Persisted State:**
- File tree structure
- Selected file
- Open folder IDs
- Editor layout (rows, groups, files)
- Active file per group
- Last-focused group
- UI toggles (Select Opened Files)

**Storage:**
- Key: `app-store`
- Storage type: `sessionStorage`
- Survives page refresh within same tab
- Cleared when tab/browser closes

---

## 8. Configuration

### 8.1 Editor Layout Limits

```typescript
EDITOR_CONFIG = {
  yGroupLimit: 2,    // Maximum 2 rows (top/bottom split)
  xGroupLimit: -1    // Unlimited horizontal groups
}
```

### 8.2 Drag Activation

```typescript
DRAG_ACTIVATION_DISTANCE = 8  // Pixels of movement before drag starts
```

---

## 9. Feature Summary

| Category | Feature | Status |
|----------|---------|--------|
| **File Tree** | Browse files/folders | Implemented |
| | Create file/folder | Implemented |
| | Rename file/folder | Implemented |
| | Delete file/folder | Implemented |
| | Expand/collapse folders | Implemented |
| | Expand/collapse all | Implemented |
| | Drag file to editor | Implemented |
| **Editor Layout** | Multiple rows | Implemented |
| | Multiple groups per row | Implemented |
| | Resizable panels | Implemented |
| | Auto-cleanup empty groups | Implemented |
| **Editor Tabs** | Open/close files | Implemented |
| | Tab reordering (drag) | Implemented |
| | Tab moving (drag between groups) | Implemented |
| | Context menu actions | Implemented |
| | Overflow menu | Implemented |
| **Sync** | Select Opened Files toggle | Implemented |
| | Reveal file in tree | Implemented |
| **Persistence** | Session storage | Implemented |

---

## 10. Future Considerations

Features not currently implemented that could be added:

- **Keyboard shortcuts** - Navigate and manage files with keyboard
- **Search/filter** - Find files by name in tree
- **File icons by type** - Different icons for different file extensions
- **Dirty state indicator** - Show unsaved changes on tabs
- **Tab pinning** - Pin tabs to prevent accidental close
- **Split within group** - Split a group into two without moving file
- **Drag to create split** - Drag tab to edge to create new row/group
- **Multi-select** - Select and operate on multiple files at once
