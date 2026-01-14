'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MODAL_NAV_ITEMS } from '@/features/projects/const';
import { ModalSection } from '@/features/projects/types';

interface Props {
  activeSection: ModalSection;
  onSectionChange: (section: ModalSection) => void;
}

const ProjectSelectorNavComponent = ({ activeSection, onSectionChange }: Props) => {
  return (
    <div className="flex w-48 flex-col border-r p-4">
      <div className="flex flex-col gap-1">
        {MODAL_NAV_ITEMS.map(item => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn('justify-start gap-2', activeSection === item.id && 'bg-accent')}
            onClick={() => onSectionChange(item.id)}
          >
            {item.icon && <item.icon className="size-4" />}
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ProjectSelectorNavComponent;
