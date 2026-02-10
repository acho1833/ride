'use client';

import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { SECTION_TOOLTIPS } from '../const';
import { KpiStats } from '../types';

interface KpiCardConfig {
  label: string;
  value: string | number;
  tooltip: string;
  warning?: boolean;
}

interface Props {
  stats: KpiStats;
}

const DashboardKpiCardsComponent = ({ stats }: Props) => {
  const cards: KpiCardConfig[] = [
    { label: 'Entities', value: stats.totalEntities, tooltip: SECTION_TOOLTIPS.entities },
    {
      label: 'Relationships',
      value: stats.totalRelationships,
      tooltip: SECTION_TOOLTIPS.relationships
    },
    { label: 'Entity Types', value: stats.uniqueEntityTypes, tooltip: SECTION_TOOLTIPS.entityTypes },
    { label: 'Predicates', value: stats.uniquePredicates, tooltip: SECTION_TOOLTIPS.predicateTypes },
    {
      label: 'Density',
      value: `${(stats.networkDensity * 100).toFixed(1)}%`,
      tooltip: SECTION_TOOLTIPS.networkDensity
    },
    {
      label: 'Avg Degree',
      value: stats.avgDegree.toFixed(1),
      tooltip: SECTION_TOOLTIPS.avgDegree
    },
    {
      label: 'Isolated',
      value: stats.isolatedCount,
      tooltip: SECTION_TOOLTIPS.isolated,
      warning: stats.isolatedCount > 0
    },
    { label: 'Leaf', value: stats.leafCount, tooltip: SECTION_TOOLTIPS.leaf }
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {cards.map((card) => (
        <div key={card.label} className="border-border bg-card rounded-lg border px-3 py-2">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">{card.label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  <p>{card.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className={cn('text-lg font-semibold', card.warning && 'text-destructive')}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardKpiCardsComponent;
