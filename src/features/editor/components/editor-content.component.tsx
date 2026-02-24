/**
 * Editor Content Router
 *
 * Routes to the appropriate editor component based on file extension.
 */

import TextComponent from '@/features/text/components/text.component';
import WorkspaceComponent from '@/features/workspace/components/workspace.component';
import NetworkTimelineComponent from '@/features/network-timeline/components/network-timeline.component';
import SpreadlineTabComponent from '@/features/spreadlines/components/spreadline-tab.component';
import RelationshipEvidenceComponent from '@/features/relationship-evidence/components/relationship-evidence.component';

interface Props {
  fileId: string;
  fileName: string;
  metadata?: Record<string, string>;
  groupId: string;
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
const EditorContentComponent = ({ fileId, fileName, metadata, groupId }: Props) => {
  const extension = getFileExtension(fileName);

  // Route to appropriate editor based on extension
  switch (extension) {
    case 'ws': {
      const workspaceId = metadata?.workspaceId;
      if (!workspaceId) {
        return (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Missing workspaceId in file metadata</div>
          </div>
        );
      }
      return <WorkspaceComponent workspaceId={workspaceId} groupId={groupId} />;
    }

    case 'nt':
      return <NetworkTimelineComponent fileId={fileId} fileName={fileName} />;

    case 'sl':
      return <SpreadlineTabComponent fileId={fileId} fileName={fileName} />;

    case 'txt':
      return <TextComponent fileId={fileId} fileName={fileName} />;

    case 're':
      return <RelationshipEvidenceComponent metadata={metadata} />;

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
