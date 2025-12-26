/**
 * Text Editor Component
 *
 * Mock editor for .txt (text) files.
 */

import React from 'react';

interface Props {
  fileId: string;
  fileName: string;
}

const TextComponent = ({ fileId, fileName }: Props) => {
  return (
    <div className="bg-background flex h-full flex-col p-4">
      <div className="mb-4 border-b pb-2">
        <h2 className="text-lg font-semibold">Text Editor</h2>
        <p className="text-muted-foreground text-sm">{fileName}</p>
      </div>
      <div className="bg-muted/30 flex-1 rounded-md border p-4">
        <div className="space-y-4">
          <div className="bg-background rounded-md p-3 shadow-sm">
            <h3 className="mb-2 font-medium">File Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File ID:</span>
                <span className="font-mono">{fileId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-mono">.txt</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Encoding:</span>
                <span>UTF-8</span>
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-md border bg-white p-4 font-mono text-sm dark:bg-zinc-950">
            <div className="space-y-1">
              <p className="text-muted-foreground">1 | This is a mock text editor.</p>
              <p className="text-muted-foreground">2 | </p>
              <p className="text-muted-foreground">3 | File Content for: {fileName}</p>
              <p className="text-muted-foreground">4 | </p>
              <p className="text-muted-foreground">5 | In a real implementation, this would be</p>
              <p className="text-muted-foreground">6 | a fully functional text editor with</p>
              <p className="text-muted-foreground">7 | syntax highlighting and editing capabilities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextComponent;
