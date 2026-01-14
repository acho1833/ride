'use client';

import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProjectsQuery } from '@/features/projects/hooks/useProjectsQuery';
import { useProjectModalOpen, useProjectActions, useCurrentProject } from '@/stores/projects/projects.selector';

interface Props {
  children: React.ReactNode;
}

const ProjectSelectorModalComponent = ({ children }: Props) => {
  const isOpen = useProjectModalOpen();
  const { setProjectModalOpen } = useProjectActions();
  const { data: projects = [] } = useProjectsQuery();
  const currentProject = useCurrentProject();

  const hasProjects = projects.length > 0;
  const canClose = hasProjects && currentProject !== null;

  const handleOpenChange = (open: boolean) => {
    // Prevent closing if user has no projects or no current project
    if (!open && !canClose) {
      return;
    }
    setProjectModalOpen(open);
  };

  const handleClose = () => {
    setProjectModalOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[80vh] max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl"
        showCloseButton={false}
        onEscapeKeyDown={e => {
          if (!canClose) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={e => {
          if (!canClose) {
            e.preventDefault();
          }
        }}
        onInteractOutside={e => {
          if (!canClose) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-lg font-semibold">Projects</DialogTitle>
          {canClose && (
            <Button variant="ghost" size="icon" onClick={handleClose} className="size-8">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
        {/* Content */}
        <div className="flex min-h-0 flex-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectSelectorModalComponent;
