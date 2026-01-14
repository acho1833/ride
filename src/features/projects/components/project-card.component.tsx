'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Project } from '@/models/project.model';

interface Props {
  project: Project;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const ProjectCardComponent = ({ project, onOpen, onEdit, onDelete }: Props) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors', 'hover:bg-accent/50')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen(project)}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">{project.name}</div>
        {project.description && <div className="text-muted-foreground truncate text-sm">{project.description}</div>}
      </div>

      <div className="text-muted-foreground text-xs whitespace-nowrap">
        {formatDistanceToNow(new Date(project.lastOpenedAt), { addSuffix: true })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className={cn('size-8', !isHovered && 'opacity-0')}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              onEdit(project);
            }}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={e => {
              e.stopPropagation();
              onDelete(project);
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ProjectCardComponent;
