'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProjectCardComponent from './project-card.component';
import type { Project } from '@/models/project.model';

interface Props {
  projects: Project[];
  isLoading: boolean;
  onOpenProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onCreateProject: () => void;
}

const ProjectListComponent = ({ projects, isLoading, onOpenProject, onEditProject, onDeleteProject, onCreateProject }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  const hasProjects = projects.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header with search and create button */}
      <div className="flex items-center gap-4 border-b p-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Search projects" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={onCreateProject}>
          <Plus className="mr-2 size-4" />
          New Project
        </Button>
      </div>

      {/* Project list or empty state */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center">Loading projects...</div>
          ) : !hasProjects ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FolderPlus className="text-muted-foreground mb-4 size-16" />
              <h3 className="mb-2 text-lg font-medium">Create your first project</h3>
              <p className="text-muted-foreground mb-6 text-center">Projects help you organize your work. Create one to get started.</p>
              <Button onClick={onCreateProject}>
                <Plus className="mr-2 size-4" />
                New Project
              </Button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">No projects match your search</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredProjects.map(project => (
                <ProjectCardComponent
                  key={project.id}
                  project={project}
                  onOpen={onOpenProject}
                  onEdit={onEditProject}
                  onDelete={onDeleteProject}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectListComponent;
