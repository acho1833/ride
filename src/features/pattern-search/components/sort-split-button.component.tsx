'use client';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from 'lucide-react';
import type { SortDirection } from '../types';

export interface SortAttribute {
  value: string;
  label: string;
}

interface Props {
  attributes: SortAttribute[];
  selectedAttribute: string;
  direction: SortDirection;
  onAttributeChange: (attribute: string) => void;
  onDirectionToggle: () => void;
}

/**
 * Split button for sorting: main button toggles direction, dropdown selects attribute.
 */
const SortSplitButtonComponent = ({ attributes, selectedAttribute, direction, onAttributeChange, onDirectionToggle }: Props) => {
  const selectedLabel = attributes.find(a => a.value === selectedAttribute)?.label ?? selectedAttribute;
  const DirectionIcon = direction === 'asc' ? ArrowDownIcon : ArrowUpIcon;

  return (
    <ButtonGroup>
      <Button variant="outline" size="sm" className="h-7 gap-x-1 text-xs" onClick={onDirectionToggle}>
        {selectedLabel}
        <DirectionIcon className="h-3 w-3" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0">
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={selectedAttribute} onValueChange={onAttributeChange}>
            {attributes.map(attr => (
              <DropdownMenuRadioItem key={attr.value} value={attr.value}>
                {attr.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
};

export default SortSplitButtonComponent;
