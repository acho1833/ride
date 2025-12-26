/**
 * Context Menu Component
 *
 * Placeholder for shadcn/ui context menu.
 * In a real implementation, this would be the full shadcn/ui context menu component.
 */

import React from 'react';

export const TypeTabContextMenu = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const TypeTabContextMenuTrigger = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const TypeTabContextMenuContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-popover text-popover-foreground border-border min-w-32 overflow-hidden rounded-md border p-1 shadow-md">
      {children}
    </div>
  );
};

export const TypeTabContextMenuItem = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
  return (
    <div
      className="hover:bg-accent hover:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none"
      onClick={onClick}
    >
      {children}
    </div>
  );
};
