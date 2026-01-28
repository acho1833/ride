/**
 * Toolbar Plugin
 *
 * Floating toolbar that appears on text selection.
 * Provides Bold, Italic, and Underline formatting toggles.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import { Bold, Italic, Underline } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
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
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
      setIsVisible(false);
      return;
    }

    // Only show toolbar if selection is inside this editor
    const editorRoot = editor.getRootElement();
    if (!editorRoot || !editorRoot.contains(domSelection.anchorNode)) {
      setIsVisible(false);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0) {
      setIsVisible(false);
      return;
    }

    setPosition({
      top: rect.top + window.scrollY - 45,
      left: rect.left + window.scrollX + rect.width / 2 - 60
    });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        updatePosition();
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, updateToolbar, updatePosition]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(updatePosition, 10);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [updatePosition]);

  if (!isVisible) {
    return null;
  }

  return createPortal(
    <div
      className="bg-popover text-popover-foreground fixed z-50 flex gap-1 rounded-md border p-1 shadow-md"
      style={{ top: position.top, left: position.left }}
    >
      <Toggle
        size="sm"
        pressed={isBold}
        onPressedChange={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        aria-label="Bold"
      >
        <Bold className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isItalic}
        onPressedChange={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        aria-label="Italic"
      >
        <Italic className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isUnderline}
        onPressedChange={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        aria-label="Underline"
      >
        <Underline className="size-4" />
      </Toggle>
    </div>,
    document.body
  );
};

export default ToolbarPlugin;
