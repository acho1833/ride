'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useProjectsQuery } from '@/features/projects/hooks/useProjectsQuery';
import { useProjectModalOpen, useProjectActions } from '@/stores/projects/projects.selector';

interface Props {
  children: React.ReactNode;
}

const ProjectSelectorModalComponent = ({ children }: Props) => {
  const isOpen = useProjectModalOpen();
  const { setProjectModalOpen } = useProjectActions();
  const { data: projects = [] } = useProjectsQuery();

  const hasProjects = projects.length > 0;

  const handleOpenChange = (open: boolean) => {
    // Prevent closing if user has no projects
    if (!open && !hasProjects) {
      return;
    }
    setProjectModalOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="h-[80vh] max-w-5xl gap-0 p-0 sm:max-w-5xl"
        showCloseButton={hasProjects}
        onEscapeKeyDown={e => {
          if (!hasProjects) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={e => {
          if (!hasProjects) {
            e.preventDefault();
          }
        }}
        onInteractOutside={e => {
          if (!hasProjects) {
            e.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">Select Project</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectSelectorModalComponent;
