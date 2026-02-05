'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrashIcon } from 'lucide-react';
import { usePredicatesQuery } from '../hooks/usePredicatesQuery';
import type { PatternEdge, PatternNode } from '../types';

interface Props {
  edge: PatternEdge;
  nodes: PatternNode[];
  onUpdate: (updates: Partial<Omit<PatternEdge, 'id'>>) => void;
  onDelete: () => void;
}

/**
 * Configuration panel for a selected pattern edge.
 * Allows editing source/target nodes and predicate filters.
 */
const EdgeConfigPanelComponent = ({ edge, nodes, onUpdate, onDelete }: Props) => {
  // Fetch available predicates
  const { data: predicates = [] } = usePredicatesQuery();

  // Handle source change
  const handleSourceChange = (nodeId: string) => {
    if (nodeId !== edge.targetNodeId) {
      onUpdate({ sourceNodeId: nodeId });
    }
  };

  // Handle target change
  const handleTargetChange = (nodeId: string) => {
    if (nodeId !== edge.sourceNodeId) {
      onUpdate({ targetNodeId: nodeId });
    }
  };

  // Toggle predicate selection
  const handlePredicateToggle = (predicate: string) => {
    const current = edge.predicates;
    const updated = current.includes(predicate) ? current.filter(p => p !== predicate) : [...current, predicate];
    onUpdate({ predicates: updated });
  };

  // Toggle "Any" (clear all predicates)
  const handleAnyToggle = () => {
    if (edge.predicates.length > 0) {
      onUpdate({ predicates: [] });
    }
  };

  const isAnySelected = edge.predicates.length === 0;

  return (
    <div className="flex flex-col gap-y-3 p-3">
      {/* Header */}
      <div className="font-medium">Edge</div>

      {/* From/To selectors */}
      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">From</Label>
        <Select value={edge.sourceNodeId} onValueChange={handleSourceChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nodes
              .filter(n => n.id !== edge.targetNodeId)
              .map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">To</Label>
        <Select value={edge.targetNodeId} onValueChange={handleTargetChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nodes
              .filter(n => n.id !== edge.sourceNodeId)
              .map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Predicate checkboxes */}
      <div className="flex flex-col gap-y-1">
        <Label className="text-xs">Predicates</Label>
        <div className="flex flex-col gap-y-1">
          {/* Any option */}
          <label className="hover:bg-accent flex cursor-pointer items-center gap-x-2 rounded p-1">
            <Checkbox checked={isAnySelected} onCheckedChange={handleAnyToggle} />
            <span className="text-xs">Any</span>
          </label>

          {/* Individual predicates */}
          {predicates.map(predicate => (
            <label key={predicate} className="hover:bg-accent flex cursor-pointer items-center gap-x-2 rounded p-1">
              <Checkbox checked={edge.predicates.includes(predicate)} onCheckedChange={() => handlePredicateToggle(predicate)} />
              <span className="text-xs">{predicate}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Delete button */}
      <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={onDelete}>
        <TrashIcon className="mr-1 h-3 w-3" />
        Delete Edge
      </Button>
    </div>
  );
};

export default EdgeConfigPanelComponent;
