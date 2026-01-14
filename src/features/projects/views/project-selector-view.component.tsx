'use client';

import { useState } from 'react';
import ProjectSelectorModalComponent from '@/features/projects/components/project-selector-modal.component';
import ProjectSelectorNavComponent from '@/features/projects/components/project-selector-nav.component';
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
import type { ModalSection } from '@/features/projects/types';

const ProjectSelectorViewComponent = () => {
  const [activeSection, setActiveSection] = useState<ModalSection>('projects');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  // Queries
  const { data: projects = [], isPending: isLoadingProjects } = useProjectsQuery();

  // Mutations
  const { mutate: createProject, isPending: isCreating } = useProjectCreateMutation();
  const { mutate: updateProject, isPending: isUpdating } = useProjectUpdateMutation();
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

  const handleCreateProject = (data: { name: string; description: string }) => {
    createProject(data, {
      onSuccess: newProject => {
        setCreateDialogOpen(false);
        // Auto-open the new project
        handleOpenProject(newProject);
      }
    });
  };

  const handleEditProject = (data: { name: string; description: string }) => {
    if (!editProject) return;
    updateProject(
      { id: editProject.id, ...data },
      {
        onSuccess: () => {
          setEditProject(null);
        }
      }
    );
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
        <div className="flex h-full min-h-0 overflow-hidden">
          <ProjectSelectorNavComponent activeSection={activeSection} onSectionChange={setActiveSection} />

          {activeSection === 'projects' && (
            <ProjectListComponent
              projects={projects}
              isLoading={isLoadingProjects}
              onOpenProject={handleOpenProject}
              onEditProject={setEditProject}
              onDeleteProject={setDeleteProject}
              onCreateProject={() => setCreateDialogOpen(true)}
            />
          )}

          {/* Future sections can be added here */}
        </div>
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
