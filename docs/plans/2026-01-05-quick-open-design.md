# Quick Open Feature Design

## Overview

Implement VS Code-style Quick Open (`Ctrl+P` / `Cmd+P`) for fast file navigation.

## Requirements

- Keyboard shortcut: `Ctrl+P` (Windows/Linux), `Cmd+P` (Mac)
- Search matches both filename and full path (e.g., "text1.txt" or "directoryA/text1.txt")
- Recently opened files appear first in results
- Selecting a file opens it in editor AND reveals it in file explorer
- No backdrop overlay - clean floating search box at top-center
- Closes on: Escape, click outside, or file selection

## File Structure

### New Files

```
src/features/quick-open/
├── components/
│   └── quick-open.component.tsx    # Main Command UI
├── hooks/
│   └── useQuickOpen.ts             # Keyboard shortcut + open state
└── utils.ts                        # Flatten file tree utility
```

### Files to Modify

```
src/features/main/components/main-view.component.tsx  # Add QuickOpen component
```

### Install

```bash
npx shadcn@latest add command
```

## Component Design

### quick-open.component.tsx

- Floating container positioned at top-center of viewport
- Uses Shadcn `Command` component (not `CommandDialog` - no backdrop)
- Shows: file icon + filename + path for each result
- Auto-focuses input when opened
- Keyboard navigation: Arrow keys, Enter to select, Escape to close
- Click outside detection to close

### useQuickOpen.ts

- Returns `{ isOpen, setIsOpen }`
- Registers global `keydown` listener
- Detects `Ctrl+P` / `Cmd+P`
- Prevents browser default (print dialog)
- Cleanup on unmount

### utils.ts

- `flattenFileTree(tree: FolderNode): FlatFile[]`
- Recursively walks tree, returns flat array
- Each item: `{ id, name, path }` where path is full path like "folder/file.txt"

## Data Flow

### On Open (Ctrl+P)

1. Hook captures keydown, calls `setIsOpen(true)`
2. Component renders floating Command UI
3. Flattens file tree from `useFileStructure()` selector
4. Gets recently opened file IDs from open-files store
5. Sorts: recently opened first, then alphabetically

### On Search

1. Command component handles fuzzy filtering internally
2. Matches against both filename and full path
3. Results update in real-time

### On Select

1. Get selected file's `id` and `name`
2. Call `openFile(id, name)` from open-files actions
3. Call `revealFile(id)` from files actions
4. Call `setIsOpen(false)` to close

## Implementation Steps

1. Install Shadcn Command component
2. Create `src/features/quick-open/utils.ts` with `flattenFileTree`
3. Create `src/features/quick-open/hooks/useQuickOpen.ts`
4. Create `src/features/quick-open/components/quick-open.component.tsx`
5. Add QuickOpen to `main-view.component.tsx`
6. Test keyboard shortcut and file selection
