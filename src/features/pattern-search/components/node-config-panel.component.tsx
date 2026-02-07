'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import { useEntityTypesQuery } from '@/features/entity-search/hooks/useEntityTypesQuery';
import { ENTITY_ATTRIBUTES } from '../const';
import type { PatternNode, AttributeFilter } from '../types';

interface Props {
  node: PatternNode;
  onUpdate: (updates: Partial<Omit<PatternNode, 'id'>>) => void;
  onAddFilter: (filter: AttributeFilter) => void;
  onUpdateFilter: (filterIndex: number, updates: Partial<AttributeFilter>) => void;
  onRemoveFilter: (filterIndex: number) => void;
  onDelete: () => void;
}

/**
 * Configuration panel for a selected pattern node.
 * Allows editing type filter and generic attribute filters.
 * Filters are saved immediately as you type for live preview.
 */
const NodeConfigPanelComponent = ({ node, onUpdate, onAddFilter, onUpdateFilter, onRemoveFilter, onDelete }: Props) => {
  const [filtersOpen, setFiltersOpen] = useState(node.filters.length > 0);
  const [newAttribute, setNewAttribute] = useState<string>(ENTITY_ATTRIBUTES[0].key);

  // Fetch available entity types
  const { data: entityTypes = [] } = useEntityTypesQuery();

  // Handle type change
  const handleTypeChange = (value: string) => {
    onUpdate({ type: value === 'any' ? null : value });
  };

  // Handle pattern change - updates filter immediately for live preview
  const handlePatternChange = (filterIndex: number, patternIndex: number, value: string) => {
    const filter = node.filters[filterIndex];
    const newPatterns = [...filter.patterns];
    newPatterns[patternIndex] = value;
    onUpdateFilter(filterIndex, { patterns: newPatterns });
  };

  // Add new empty filter for an attribute
  const handleAddFilter = () => {
    // Check if filter for this attribute already exists
    const existingIndex = node.filters.findIndex(f => f.attribute === newAttribute);
    if (existingIndex >= 0) {
      // Add empty pattern to existing filter
      const existing = node.filters[existingIndex];
      onUpdateFilter(existingIndex, {
        patterns: [...existing.patterns, '']
      });
    } else {
      // Create new filter with empty pattern
      onAddFilter({ attribute: newAttribute, patterns: [''] });
    }
  };

  // Remove a pattern from a filter
  const handleRemovePattern = (filterIndex: number, patternIndex: number) => {
    const filter = node.filters[filterIndex];
    const newPatterns = filter.patterns.filter((_, i) => i !== patternIndex);
    if (newPatterns.length === 0) {
      // Remove entire filter if no patterns left
      onRemoveFilter(filterIndex);
    } else {
      onUpdateFilter(filterIndex, { patterns: newPatterns });
    }
  };

  // Get attribute label from key
  const getAttributeLabel = (key: string) => {
    return ENTITY_ATTRIBUTES.find(a => a.key === key)?.label ?? key;
  };

  return (
    <div className="flex flex-col gap-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{node.label}</span>
      </div>

      {/* Type selector */}
      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">Type</Label>
        <Select value={node.type ?? 'any'} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Type</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters section (collapsible) */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-x-1 text-xs font-medium">
          {filtersOpen ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
          Filters ({node.filters.reduce((sum, f) => sum + f.patterns.length, 0)})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 flex flex-col gap-y-3">
          {/* Existing filters grouped by attribute - editable for live preview */}
          {node.filters.map((filter, filterIndex) => (
            <div key={filterIndex} className="flex flex-col gap-y-1">
              <Label className="text-muted-foreground text-xs">{getAttributeLabel(filter.attribute)} matches (any of):</Label>
              {filter.patterns.map((pattern, patternIndex) => (
                <div key={patternIndex} className="flex items-center gap-x-1">
                  <Input
                    value={pattern}
                    onChange={e => handlePatternChange(filterIndex, patternIndex, e.target.value)}
                    placeholder="e.g., John* or J?hn"
                    className="h-7 flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRemovePattern(filterIndex, patternIndex)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))}

          {/* Add new filter */}
          <div className="flex flex-col gap-y-1">
            <Label className="text-xs">Add filter:</Label>
            <div className="flex items-center gap-x-1">
              <Select value={newAttribute} onValueChange={setNewAttribute}>
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_ATTRIBUTES.map(attr => (
                    <SelectItem key={attr.key} value={attr.key}>
                      {attr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAddFilter}>
                <PlusIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete button */}
      <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={onDelete}>
        <TrashIcon className="mr-1 h-3 w-3" />
        Delete Node
      </Button>
    </div>
  );
};

export default NodeConfigPanelComponent;
