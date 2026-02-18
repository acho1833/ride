'use client';

/**
 * Spreadline Tab Component
 *
 * Editor tab for .sl files. Shows D3 force graph on top
 * and SpreadLine chart on bottom in a resizable split layout.
 */

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import SpreadlineGraphComponent from './spreadline-graph.component';
import SpreadlineComponent from './spreadline.component';

interface Props {
  fileId: string;
  fileName: string;
}

const SpreadlineTabComponent = (_props: Props) => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Graph Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full overflow-hidden">
            <SpreadlineGraphComponent />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Spreadline Chart Panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full overflow-hidden">
            <SpreadlineComponent />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SpreadlineTabComponent;
