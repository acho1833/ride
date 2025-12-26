/**
 * Editor Content Router
 *
 * Routes to the appropriate editor component based on file extension.
 */

import React from 'react';
import WorkspaceComponent from '@/features/workspace/components/workspace.component';
import TextComponent from '@/features/text/components/text.component';

interface Props {
  fileId: string;
  fileName: string;
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Editor content router component
 * Renders the appropriate editor based on file extension
 */
const EditorContentComponent = ({ fileId, fileName }: Props) => {
  const extension = getFileExtension(fileName);

  // Route to appropriate editor based on extension
  switch (extension) {
    case 'ws':
      return <div>Workspace Content</div>;

    case 'txt':
      return <TextComponent fileId={fileId} fileName={fileName} />;

    default:
      // Fallback editor for unknown types
      return (
        <div className="bg-background flex h-full flex-col items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Unknown File Type</h2>
            <p className="text-muted-foreground mt-2 text-sm">{fileName}</p>
            <p className="text-muted-foreground mt-1 text-xs">Extension: {extension || 'none'}</p>
            <div className="bg-muted/30 mt-4 rounded-md border p-4">
              <p className="text-muted-foreground text-sm">No editor available for this file type.</p>
            </div>
          </div>
        </div>
      );
  }
};

export default EditorContentComponent;
