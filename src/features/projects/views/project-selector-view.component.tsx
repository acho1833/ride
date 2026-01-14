'use client';

import { useState } from 'react';
import ProjectSelectorModalComponent from '@/features/projects/components/project-selector-modal.component';
import ProjectListComponent from '@/features/projects/components/project-list.component';
import ProjectCreateDialogComponent from '@/features/projects/components/project-create-dialog.component';
import ProjectDeleteDialogComponent from '@/features/projects/components/project-delete-dialog.component';
import { useProjectsQuery } from '@/features/projects/hooks/useProjectsQuery';
import { useProjectCreateMutation } from '@/features/projects/hooks/useProjectCreateMutation';
import { useProjectUpdateMutation } from '@/features/projects/hooks/useProjectUpdateMutation';
import { useProjectDeleteMutation } from '@/features/projects/hooks/useProjectDeleteMutation';
import { useProjectOpenMutation } from '@/features/projects/hooks/useProjectOpenMutation';
import { useProjectActions, useCurrentProject } from '@/stores/projects/projects.selector';
import type { Project } from '@/models/project.model';

const ProjectSelectorViewComponent = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  // Queries
  const { data: projects = [], isPending: isLoadingProjects } = useProjectsQuery();

  // Mutations
  const { mutateAsync: createProjectAsync, isPending: isCreating } = useProjectCreateMutation();
  const { mutateAsync: updateProjectAsync, isPending: isUpdating } = useProjectUpdateMutation();
  const { mutate: deleteProjectMutation, isPending: isDeleting } = useProjectDeleteMutation();
  const { mutate: openProject } = useProjectOpenMutation();

  // Actions
  const currentProject = useCurrentProject();
  const { setCurrentProject, setProjectModalOpen, setProjectLoading } = useProjectActions();

  const handleOpenProject = (project: Project) => {
    setProjectModalOpen(false);
    // Set loading state (also resets file tree and open files state)
    setProjectLoading(true);
    // Set the project directly - we already have the full project data
    setCurrentProject(project);
    // Update lastOpenedAt on server (fire and forget)
    openProject({ id: project.id });
  };

  const handleCreateProject = async (data: { name: string; description: string }) => {
    const newProject = await createProjectAsync(data);
    setCreateDialogOpen(false);
    // Auto-open the new project
    handleOpenProject(newProject);
  };

  const handleEditProject = async (data: { name: string; description: string }) => {
    if (!editProject) return;
    await updateProjectAsync({ id: editProject.id, ...data });
    setEditProject(null);
  };

  const handleDeleteProject = () => {
    if (!deleteProject) return;
    const isDeletingCurrentProject = currentProject?.id === deleteProject.id;

    deleteProjectMutation(
      { id: deleteProject.id },
      {
        onSuccess: () => {
          setDeleteProject(null);
          // If deleting the current project, clear state
          if (isDeletingCurrentProject) {
            setCurrentProject(null);
          }
        }
      }
    );
  };

  return (
    <>
      <ProjectSelectorModalComponent>
        <ProjectListComponent
          projects={projects}
          currentProjectId={currentProject?.id ?? null}
          isLoading={isLoadingProjects}
          onOpenProject={handleOpenProject}
          onEditProject={setEditProject}
          onDeleteProject={setDeleteProject}
          onCreateProject={() => setCreateDialogOpen(true)}
        />
      </ProjectSelectorModalComponent>

      {/* Create/Edit Dialog */}
      <ProjectCreateDialogComponent
        open={createDialogOpen || !!editProject}
        onOpenChange={open => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditProject(null);
          }
        }}
        onSubmit={editProject ? handleEditProject : handleCreateProject}
        editProject={editProject}
        isPending={isCreating || isUpdating}
      />

      {/* Delete Dialog */}
      <ProjectDeleteDialogComponent
        open={!!deleteProject}
        onOpenChange={open => !open && setDeleteProject(null)}
        project={deleteProject}
        onConfirm={handleDeleteProject}
        isPending={isDeleting}
      />
    </>
  );
};

export default ProjectSelectorViewComponent;
