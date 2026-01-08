/**
 * Text Component
 *
 * Wrapper component for .txt files that renders the Lexical text editor.
 */

'use client';

import TextEditorComponent from '@/features/text/components/text-editor.component';

interface Props {
  fileId: string;
  fileName: string;
}

const TextComponent = ({ fileId, fileName }: Props) => {
  return <TextEditorComponent fileId={fileId} fileName={fileName} />;
};

export default TextComponent;
