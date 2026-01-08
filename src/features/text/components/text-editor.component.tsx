/**
 * Text Editor Component
 *
 * Lexical-based rich text editor with formatting toolbar and insert menu.
 */

'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode } from '@lexical/rich-text';

import ToolbarPlugin from '@/features/text/plugins/toolbar.plugin';
import InsertMenuPlugin from '@/features/text/plugins/insert-menu.plugin';
import { EDITOR_THEME, PLACEHOLDER_TEXT } from '@/features/text/const';

interface Props {
  fileId: string;
  fileName: string;
}

const TextEditorComponent = ({ fileId, fileName }: Props) => {
  const initialConfig = {
    namespace: `text-editor-${fileId}`,
    theme: EDITOR_THEME,
    nodes: [HeadingNode],
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    }
  };

  return (
    <div className="relative h-full">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative h-full">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="bg-background text-foreground h-full min-h-[200px] p-4 outline-none"
                aria-label={`Text editor for ${fileName}`}
              />
            }
            placeholder={
              <div className="text-muted-foreground pointer-events-none absolute left-4 top-4">
                {PLACEHOLDER_TEXT}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ToolbarPlugin />
          <InsertMenuPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
};

export default TextEditorComponent;
