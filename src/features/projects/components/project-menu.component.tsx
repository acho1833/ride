'use client';

import { useState } from 'react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useCurrentProject, useProjectActions } from '@/stores/projects/projects.selector';
import { useProjectCreateMutation } from '@/features/projects/hooks/useProjectCreateMutation';
import { useProjectDeleteMutation } from '@/features/projects/hooks/useProjectDeleteMutation';
import ProjectCreateDialogComponent from './project-create-dialog.component';
import ProjectDeleteDialogComponent from './project-delete-dialog.component';

const ProjectMenuComponent = () => {
  const currentProject = useCurrentProject();
  const { setProjectModalOpen, setCurrentProject, setProjectLoading } = useProjectActions();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { mutateAsync: createProjectAsync, isPending: isCreating } = useProjectCreateMutation();

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: deleteProject, isPending: isDeleting } = useProjectDeleteMutation();

  const handleCreate = async (data: { name: string; description: string }) => {
    const newProject = await createProjectAsync(data);
    setCreateDialogOpen(false);
    // Set loading state (also resets file tree and open files state)
    setProjectLoading(true);
    // Set the new project directly - no need to call openProject
    // since we already have the full project data
    setCurrentProject(newProject);
  };

  const handleOpen = () => {
    setProjectModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!currentProject) return;

    deleteProject(
      { id: currentProject.id },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          // setCurrentProject(null) automatically resets file tree and open files state
          setCurrentProject(null);
        }
      }
    );
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Project</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault();
              setCreateDialogOpen(true);
            }}
          >
            New
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpen}>Open</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault();
              setDeleteDialogOpen(true);
            }}
            disabled={!currentProject}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <ProjectCreateDialogComponent
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isPending={isCreating}
      />

      <ProjectDeleteDialogComponent
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        project={currentProject}
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </>
  );
};

export default ProjectMenuComponent;
