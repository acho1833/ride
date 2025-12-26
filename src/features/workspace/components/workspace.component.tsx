/**
 * Workspace Editor Component
 *
 * Mock editor for .ws (workspace) files.
 */
import React from 'react';

interface Props {
  fileId: string;
  fileName: string;
  workspace: any;
}

const WorkspaceComponent = ({ fileId: _fieldId, fileName: _fileName, workspace: _workspace }: Props) => {
  return (
    <svg viewBox="0 0 400 200" className="bg-background h-full w-full rounded-lg border">
      {/* Links */}
      <line x1="100" y1="60" x2="200" y2="140" className="stroke-muted-foreground stroke-2" />
      <line x1="300" y1="60" x2="200" y2="140" className="stroke-muted-foreground stroke-2" />

      {/* Node A */}
      <g className="cursor-pointer">
        <circle cx="100" cy="60" r="18" className="fill-primary stroke-primary-foreground stroke-2" />
        <text x="100" y="90" textAnchor="middle" className="fill-foreground text-xs">
          Node A
        </text>
      </g>

      {/* Node B */}
      <g className="cursor-pointer">
        <circle cx="300" cy="60" r="18" className="fill-primary stroke-primary-foreground stroke-2" />
        <text x="300" y="90" textAnchor="middle" className="fill-foreground text-xs">
          Node B
        </text>
      </g>

      {/* Node C */}
      <g className="cursor-pointer">
        <circle cx="200" cy="140" r="18" className="fill-secondary stroke-secondary-foreground stroke-2" />
        <text x="200" y="170" textAnchor="middle" className="fill-foreground text-xs">
          Node C
        </text>
      </g>
    </svg>
  );
};

export default WorkspaceComponent;
