# Lexical Text Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mock text editor for `.txt` files with a Lexical-based rich text editor supporting bold, italic, underline, headings, and tables.

**Architecture:** LexicalComposer wraps the editor with plugins for rich text, tables, floating toolbar, insert menu, and table context menu. All UI uses Shadcn components for theme consistency.

**Tech Stack:** Lexical, @lexical/react, @lexical/table, Shadcn UI (Toggle, Button, DropdownMenu, ContextMenu)

---

## Overview

Replace the mock text editor for `.txt` files with a real Lexical-based rich text editor.

## Features

### Text Formatting (via floating toolbar on selection)
- Bold (Ctrl+B)
- Italic (Ctrl+I)
- Underline (Ctrl+U)

### Block Elements (via "+" insert button)
- Heading 1
- Heading 2
- Table (inserts 3x3 by default)

### Table Operations (via right-click context menu)
- Add row above/below
- Add column left/right
- Delete row
- Delete column
- Delete table

### Editor Behavior
- Full height (no ScrollArea wrapper, same as .ws files)
- Matches shadcn light/dark themes using CSS variables
- No database persistence (in-memory only for now)
- Placeholder text when empty

## File Structure

### New files to create
```
src/features/text/
├── components/
│   ├── text-editor.component.tsx      # Main Lexical editor wrapper
│   ├── text-toolbar.component.tsx     # Floating toolbar (bold/italic/underline)
│   ├── text-insert-menu.component.tsx # "+" button with dropdown (h1/h2/table)
│   └── text-table-menu.component.tsx  # Right-click context menu for tables
├── plugins/
│   ├── toolbar.plugin.tsx             # Floating toolbar plugin
│   ├── table-context-menu.plugin.tsx  # Table right-click menu plugin
│   └── insert-menu.plugin.tsx         # "+" insert button plugin
├── const.ts                           # Editor constants
└── types.ts                           # Editor types (if needed)
```

### Existing files to modify
```
src/features/text/components/text.component.tsx  # Replace mock with Lexical editor
src/features/editor/components/editor-group.component.tsx  # Add .txt to full-height check
package.json  # Add lexical dependencies
```

## Component Architecture

```
┌─────────────────────────────────────────────────┐
│  LexicalComposer (config + theme)               │
│  ┌─────────────────────────────────────────────┐│
│  │ RichTextPlugin (contentEditable)            ││
│  │ HistoryPlugin (undo/redo)                   ││
│  │ TablePlugin (table support)                 ││
│  │ ToolbarPlugin (floating toolbar)            ││
│  │ InsertMenuPlugin ("+" button)               ││
│  │ TableContextMenuPlugin (right-click menu)   ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Theme Integration

- Lexical theme object maps to shadcn CSS variables
- `--background`, `--foreground`, `--border`, `--muted`, `--primary` etc.
- Tables use `border-border`, headers use appropriate font sizes
- Selection/focus states use `ring` variable

## UI Components

### Floating Toolbar
- Appears above selected text (uses Lexical's selection API)
- Shadcn `Toggle` buttons for Bold/Italic/Underline
- Positioned using selection rect coordinates
- Disappears when selection is collapsed

### Insert Menu
- Fixed position: bottom-right corner (same as graph zoom buttons)
- Shadcn `Button` with `Plus` icon
- Shadcn `DropdownMenu` with options: Heading 1, Heading 2, Table

### Table Context Menu
- Uses Shadcn `ContextMenu` (same pattern as workspace graph)
- Menu items: Insert row above/below, Insert column left/right, Delete row/column/table

## Keyboard Shortcuts

- Ctrl+B: Bold
- Ctrl+I: Italic
- Ctrl+U: Underline
- Ctrl+Z: Undo
- Ctrl+Shift+Z: Redo
- Tab: Navigate table cells

## Dependencies

```
lexical
@lexical/react
@lexical/rich-text
@lexical/table
@lexical/selection
@lexical/utils
```

## UI Decision

Shadcn components for all UI (toolbar buttons, dropdowns, context menus). Lexical does not provide pre-built UI - their playground uses custom HTML/CSS. Using Shadcn ensures consistency with app design system and automatic light/dark theme support.

## Summary

| Aspect | Decision |
|--------|----------|
| Formatting | Bold, italic, underline, H1, H2, tables |
| Floating toolbar | Shadcn Toggle buttons on text selection |
| Insert menu | "+" button (bottom-right) with dropdown |
| Table operations | Right-click context menu |
| Theme | Shadcn CSS variables (light/dark) |
| ScrollArea | Skipped (full height like .ws) |
| Persistence | None (in-memory only) |

---

## Implementation Tasks

### Task 1: Install Dependencies

**Step 1: Install Lexical packages**

```bash
npm install lexical @lexical/react @lexical/rich-text @lexical/table @lexical/selection @lexical/utils
```

**Step 2: Install Shadcn Toggle component**

```bash
npx shadcn@latest add toggle
```

**Step 3: Verify installation**

```bash
npm run build
```

---

### Task 2: Create Editor Constants and Theme

**Files:**
- Create: `src/features/text/const.ts`

**Step 1: Create const.ts with Lexical theme mapping to Shadcn CSS variables**

```typescript
// src/features/text/const.ts

/**
 * Lexical editor theme using Tailwind/Shadcn CSS classes
 */
export const EDITOR_THEME = {
  paragraph: 'mb-2',
  heading: {
    h1: 'text-3xl font-bold mb-4',
    h2: 'text-2xl font-semibold mb-3'
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline'
  },
  table: 'border-collapse border border-border w-full my-4',
  tableCell: 'border border-border p-2 min-w-[75px]',
  tableCellHeader: 'border border-border p-2 bg-muted font-semibold'
};

export const DEFAULT_TABLE_SIZE = {
  rows: 3,
  columns: 3
};

export const PLACEHOLDER_TEXT = 'Start typing...';
```

---

### Task 3: Create Main Editor Component

**Files:**
- Create: `src/features/text/components/text-editor.component.tsx`

**Step 1: Create the LexicalComposer wrapper with all plugins**

```typescript
// src/features/text/components/text-editor.component.tsx
'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { HeadingNode } from '@lexical/rich-text';

import { EDITOR_THEME, PLACEHOLDER_TEXT } from '../const';
import ToolbarPlugin from '../plugins/toolbar.plugin';
import InsertMenuPlugin from '../plugins/insert-menu.plugin';
import TableContextMenuPlugin from '../plugins/table-context-menu.plugin';

interface Props {
  fileId: string;
}

const TextEditorComponent = ({ fileId }: Props) => {
  const initialConfig = {
    namespace: `text-editor-${fileId}`,
    theme: EDITOR_THEME,
    onError: (error: Error) => console.error(error),
    nodes: [HeadingNode, TableNode, TableCellNode, TableRowNode]
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative h-full w-full">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="prose prose-sm dark:prose-invert h-full w-full p-4 outline-none" />
          }
          placeholder={
            <div className="text-muted-foreground pointer-events-none absolute top-4 left-4">
              {PLACEHOLDER_TEXT}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <TablePlugin />
        <ToolbarPlugin />
        <InsertMenuPlugin />
        <TableContextMenuPlugin />
      </div>
    </LexicalComposer>
  );
};

export default TextEditorComponent;
```

---

### Task 4: Create Floating Toolbar Plugin

**Files:**
- Create: `src/features/text/plugins/toolbar.plugin.tsx`

**Step 1: Create floating toolbar with bold/italic/underline toggles**

```typescript
// src/features/text/plugins/toolbar.plugin.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setIsVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0) {
      setIsVisible(false);
      return;
    }

    setPosition({
      top: rect.top - 48 + window.scrollY,
      left: rect.left + rect.width / 2 - 60
    });
    setIsVisible(true);
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          updatePosition();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateToolbar, updatePosition]);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition);
    return () => document.removeEventListener('selectionchange', updatePosition);
  }, [updatePosition]);

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="bg-popover border-border fixed z-50 flex gap-1 rounded-md border p-1 shadow-md"
      style={{ top: position.top, left: position.left }}
    >
      <Toggle
        size="sm"
        pressed={isBold}
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isItalic}
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isUnderline}
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  );
};

export default ToolbarPlugin;
```

---

### Task 5: Create Insert Menu Plugin

**Files:**
- Create: `src/features/text/plugins/insert-menu.plugin.tsx`

**Step 1: Create "+" button with dropdown for H1, H2, Table**

```typescript
// src/features/text/plugins/insert-menu.plugin.tsx
'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $setBlocksType } from '@lexical/selection';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Plus, Heading1, Heading2, Table } from 'lucide-react';
import { DEFAULT_TABLE_SIZE } from '../const';

const InsertMenuPlugin = () => {
  const [editor] = useLexicalComposerContext();

  const insertHeading = (level: 'h1' | 'h2') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: String(DEFAULT_TABLE_SIZE.rows),
      columns: String(DEFAULT_TABLE_SIZE.columns)
    });
  };

  return (
    <div className="absolute right-4 bottom-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Insert">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => insertHeading('h1')}>
            <Heading1 className="mr-2 h-4 w-4" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertHeading('h2')}>
            <Heading2 className="mr-2 h-4 w-4" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={insertTable}>
            <Table className="mr-2 h-4 w-4" />
            Table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default InsertMenuPlugin;
```

---

### Task 6: Create Table Context Menu Plugin

**Files:**
- Create: `src/features/text/plugins/table-context-menu.plugin.tsx`

**Step 1: Create right-click context menu for table operations**

```typescript
// src/features/text/plugins/table-context-menu.plugin.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import {
  $isTableCellNode,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL
} from '@lexical/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Table
} from 'lucide-react';

const TableContextMenuPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [isInTable, setIsInTable] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contextMenuOpenRef = useRef(false);

  const checkIfInTable = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const cellNode = $getTableCellNodeFromLexicalNode(anchorNode);
        setIsInTable(cellNode !== null);
      } else {
        setIsInTable(false);
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      checkIfInTable();
    });
  }, [editor, checkIfInTable]);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (!isInTable) return;

      event.preventDefault();

      const openMenu = () => {
        if (triggerRef.current) {
          triggerRef.current.style.left = `${event.clientX}px`;
          triggerRef.current.style.top = `${event.clientY}px`;
          triggerRef.current.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              clientX: event.clientX,
              clientY: event.clientY
            })
          );
        }
      };

      if (contextMenuOpenRef.current) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        setTimeout(openMenu, 150);
      } else {
        openMenu();
      }
    },
    [isInTable]
  );

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener('contextmenu', handleContextMenu);
      return () => rootElement.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [editor, handleContextMenu]);

  const insertRowAbove = () => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(false);
    });
  };

  const insertRowBelow = () => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(true);
    });
  };

  const insertColumnLeft = () => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(false);
    });
  };

  const insertColumnRight = () => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(true);
    });
  };

  const deleteRow = () => {
    editor.update(() => {
      $deleteTableRow__EXPERIMENTAL();
    });
  };

  const deleteColumn = () => {
    editor.update(() => {
      $deleteTableColumn__EXPERIMENTAL();
    });
  };

  const deleteTable = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const cellNode = $getTableCellNodeFromLexicalNode(anchorNode);
        if (cellNode) {
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
          tableNode.remove();
        }
      }
    });
  };

  return (
    <ContextMenu onOpenChange={open => (contextMenuOpenRef.current = open)}>
      <ContextMenuTrigger asChild>
        <div ref={triggerRef} className="pointer-events-none fixed h-1 w-1" />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={insertRowAbove}>
          <ArrowUp className="mr-2 h-4 w-4" />
          Insert row above
        </ContextMenuItem>
        <ContextMenuItem onClick={insertRowBelow}>
          <ArrowDown className="mr-2 h-4 w-4" />
          Insert row below
        </ContextMenuItem>
        <ContextMenuItem onClick={insertColumnLeft}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Insert column left
        </ContextMenuItem>
        <ContextMenuItem onClick={insertColumnRight}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Insert column right
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={deleteRow}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete row
        </ContextMenuItem>
        <ContextMenuItem onClick={deleteColumn}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete column
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={deleteTable} className="text-destructive">
          <Table className="mr-2 h-4 w-4" />
          Delete table
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TableContextMenuPlugin;
```

---

### Task 7: Update Text Component

**Files:**
- Modify: `src/features/text/components/text.component.tsx`

**Step 1: Replace mock with TextEditorComponent**

```typescript
// src/features/text/components/text.component.tsx
'use client';

import TextEditorComponent from './text-editor.component';

interface Props {
  fileId: string;
  fileName: string;
}

const TextComponent = ({ fileId }: Props) => {
  return (
    <div className="h-full w-full">
      <TextEditorComponent fileId={fileId} />
    </div>
  );
};

export default TextComponent;
```

---

### Task 8: Update Editor Group for Full Height

**Files:**
- Modify: `src/features/editor/components/editor-group.component.tsx`

**Step 1: Add .txt to full-height check (alongside .ws)**

Change line 48 from:
```typescript
const isFullHeight = activeFile?.name.endsWith('.ws');
```

To:
```typescript
const isFullHeight = activeFile?.name.endsWith('.ws') || activeFile?.name.endsWith('.txt');
```

---

### Task 9: Create Plugin Directory

**Files:**
- Create: `src/features/text/plugins/` directory

**Step 1: Create the plugins directory**

```bash
mkdir -p src/features/text/plugins
```

---

### Task 10: Verify and Test

**Step 1: Run build to check for errors**

```bash
npm run build
```

**Step 2: Start dev server and test**

```bash
npm run dev
```

**Step 3: Manual testing checklist**
- [ ] Open a .txt file
- [ ] Type text and verify placeholder disappears
- [ ] Select text and verify floating toolbar appears
- [ ] Test Bold (Ctrl+B), Italic (Ctrl+I), Underline (Ctrl+U)
- [ ] Click "+" button and insert Heading 1
- [ ] Click "+" button and insert Heading 2
- [ ] Click "+" button and insert Table
- [ ] Right-click table cell and test row/column operations
- [ ] Test in light and dark themes

---

### Task 11: Commit

**Step 1: Commit all changes**

```bash
git add .
git commit -m "feat: add Lexical rich text editor for .txt files

- Install lexical and @lexical/react packages
- Create text editor with bold, italic, underline formatting
- Add floating toolbar on text selection (Shadcn Toggle)
- Add insert menu for H1, H2, and tables (Shadcn DropdownMenu)
- Add table context menu for row/column operations (Shadcn ContextMenu)
- Theme integration with shadcn light/dark modes
- Skip ScrollArea for .txt files (full height like .ws)"
```
