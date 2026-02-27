'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  SPREADLINE_RELATION_TYPE_OPTIONS,
  SPREADLINE_GRANULARITY_OPTIONS,
  SPREADLINE_FREQUENCY_COLORS,
  SPREADLINE_FREQUENCY_THRESHOLDS,
  type SpreadlineGranularity
} from '@/features/spreadlines/const';

interface Props {
  /** Left-side info text (entity/block counts, ego name) */
  infoSlot?: React.ReactNode;
  /** Additional controls inserted after the frequency legend */
  extraSlot?: React.ReactNode;
  /** Show the frequency heatmap legend */
  showFrequencyLegend?: boolean;
  /** Blocks filter */
  maxLifespan: number;
  blocksFilter: number;
  onBlocksFilterChange: (value: number) => void;
  /** Relation type */
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  /** Granularity */
  granularity: SpreadlineGranularity;
  onGranularityChange: (granularity: SpreadlineGranularity) => void;
  /** Pinned entity clear */
  pinnedCount: number;
  onClearPins: () => void;
}

const SpreadlineToolbarComponent = ({
  infoSlot,
  extraSlot,
  showFrequencyLegend = true,
  maxLifespan,
  blocksFilter,
  onBlocksFilterChange,
  relationTypes,
  onRelationTypesChange,
  granularity,
  onGranularityChange,
  pinnedCount,
  onClearPins
}: Props) => {
  return (
    <div className="bg-background border-border flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1.5 text-xs">
      {infoSlot}

      {showFrequencyLegend && (
        <>
          <div className="bg-border h-4 w-px" />
          <span className="text-muted-foreground font-medium">Frequencies</span>
          <div className="relative">
            <div className="flex">
              {SPREADLINE_FREQUENCY_COLORS.map((color, i) => (
                <span key={i} className="border-border inline-block h-2.5 w-6 border" style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="text-muted-foreground absolute flex text-[9px]">
              {SPREADLINE_FREQUENCY_THRESHOLDS.map((t, i) => (
                <span key={t} className="absolute -translate-x-1/2" style={{ left: (i + 1) * 24 }}>
                  {i === SPREADLINE_FREQUENCY_THRESHOLDS.length - 1 ? `${t}+` : t}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {extraSlot}

      <div className="flex items-center gap-2">
        <Slider min={1} max={maxLifespan} value={[blocksFilter]} onValueChange={([val]) => onBlocksFilterChange(val)} className="w-20" />
        <span className="text-foreground w-4 font-medium">{blocksFilter}</span>
        <label className="text-muted-foreground">Blocks</label>
      </div>

      <Select value={relationTypes[0]} onValueChange={val => onRelationTypesChange([val])}>
        <SelectTrigger className="ml-auto h-7 w-auto gap-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPREADLINE_RELATION_TYPE_OPTIONS.map(type => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={granularity} onValueChange={val => onGranularityChange(val as SpreadlineGranularity)}>
        <SelectTrigger className="h-7 w-auto gap-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPREADLINE_GRANULARITY_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" disabled={pinnedCount === 0} onClick={onClearPins}>
        <X className="h-3 w-3" />
        Clear
      </Button>
    </div>
  );
};

export default SpreadlineToolbarComponent;
