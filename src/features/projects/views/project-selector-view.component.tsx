'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useProjectActions } from '@/stores/projects/projects.selector';
import { useFileActions } from '@/stores/files/files.selector';
import { useOpenFilesActions } from '@/stores/open-files/open-files.selector';
import type { Project } from '@/models/project.model';
import type { ModalSection } from '@/features/projects/types';

const ProjectSelectorViewComponent = () => {
  const queryClient = useQueryClient();
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
  const { setCurrentProject, setProjectModalOpen } = useProjectActions();
  const { resetFileTreeState } = useFileActions();
  const { resetOpenFilesState } = useOpenFilesActions();

  const handleOpenProject = (project: Project) => {
    // Reset state before opening new project
    resetFileTreeState();
    resetOpenFilesState();
    queryClient.clear();

    // Open project and update state
    openProject(
      { id: project.id },
      {
        onSuccess: openedProject => {
          setCurrentProject(openedProject);
          setProjectModalOpen(false);
        }
      }
    );
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
    deleteProjectMutation(
      { id: deleteProject.id },
      {
        onSuccess: () => {
          setDeleteProject(null);
        }
      }
    );
  };

  return (
    <>
      <ProjectSelectorModalComponent>
        <div className="flex h-full">
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
