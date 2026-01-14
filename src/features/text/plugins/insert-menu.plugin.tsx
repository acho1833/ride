/**
 * Insert Menu Plugin
 *
 * Fixed "+" button in bottom-right corner with dropdown menu.
 * Allows inserting H1 and H2 elements.
 */

'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { Heading1, Heading2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const InsertMenuPlugin = () => {
  const [editor] = useLexicalComposerContext();

  const insertHeading = (level: 'h1' | 'h2') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
    editor.focus();
  };

  return (
    <div className="fixed right-6 bottom-6 z-40 hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" className="size-12 rounded-full shadow-lg">
            <Plus className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8}>
          <DropdownMenuItem onClick={() => insertHeading('h1')}>
            <Heading1 className="size-4" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertHeading('h2')}>
            <Heading2 className="size-4" />
            Heading 2
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default InsertMenuPlugin;
