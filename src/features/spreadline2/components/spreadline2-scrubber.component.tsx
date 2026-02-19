'use client';

/**
 * Spreadline 2 Time Scrubber Component
 *
 * Horizontal control bar for navigating time blocks in the spreadline visualization.
 * Features: play/pause animation, speed control, clickable time dots,
 * resizable/pannable range selector, ALL mode toggle.
 *
 * Range: [startIndex, endIndex] into timeBlocks, or null for ALL mode.
 * Drag left/right handles to resize. Drag middle to pan. Click dot for single selection.
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SCRUBBER2_SPEED_OPTIONS, SCRUBBER2_DEFAULT_SPEED_MS } from '@/features/spreadline2/const';

interface Props {
  timeBlocks: string[];
  selectedRange: [number, number] | null;
  onRangeChange: (range: [number, number] | null) => void;
}

interface DragState {
  mode: 'left' | 'right' | 'pan';
  startIdx: number;
  origRange: [number, number];
}

const Spreadline2ScrubberComponent = ({ timeBlocks, selectedRange, onRangeChange }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(SCRUBBER2_DEFAULT_SPEED_MS);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // Keep values in refs for window-level drag handlers
  const selectedRangeRef = useRef(selectedRange);
  useLayoutEffect(() => {
    selectedRangeRef.current = selectedRange;
  }, [selectedRange]);

  const onRangeChangeRef = useRef(onRangeChange);
  useLayoutEffect(() => {
    onRangeChangeRef.current = onRangeChange;
  }, [onRangeChange]);

  const maxIdx = timeBlocks.length - 1;
  const maxIdxRef = useRef(maxIdx);
  useLayoutEffect(() => {
    maxIdxRef.current = maxIdx;
  }, [maxIdx]);

  // Convert client X position to nearest dot index
  const xToIndex = useCallback((clientX: number): number => {
    if (!trackRef.current || maxIdxRef.current <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const fraction = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, fraction));
    return Math.round(clamped * maxIdxRef.current);
  }, []);

  // Window-level drag listeners (stable via refs)
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const idx = xToIndex(e.clientX);
      const max = maxIdxRef.current;
      const [origStart, origEnd] = drag.origRange;

      if (drag.mode === 'left') {
        onRangeChangeRef.current([Math.min(idx, origEnd), origEnd]);
      } else if (drag.mode === 'right') {
        onRangeChangeRef.current([origStart, Math.max(idx, origStart)]);
      } else if (drag.mode === 'pan') {
        const delta = idx - drag.startIdx;
        const rangeSize = origEnd - origStart;
        let newStart = origStart + delta;
        let newEnd = origEnd + delta;
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeSize;
        }
        if (newEnd > max) {
          newEnd = max;
          newStart = max - rangeSize;
        }
        onRangeChangeRef.current([newStart, newEnd]);
      }
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [xToIndex]);

  // Auto-advance animation loop — slides range forward each tick
  useEffect(() => {
    if (!isPlaying || timeBlocks.length === 0) return;

    const interval = setInterval(() => {
      const current = selectedRangeRef.current;
      const max = maxIdxRef.current;
      if (!current) {
        onRangeChangeRef.current([0, 0]);
      } else {
        const rangeSize = current[1] - current[0];
        const nextStart = current[0] + 1;
        if (nextStart + rangeSize > max) {
          onRangeChangeRef.current([0, rangeSize]);
        } else {
          onRangeChangeRef.current([nextStart, nextStart + rangeSize]);
        }
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [isPlaying, speedMs, timeBlocks.length]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleAllClick = useCallback(() => {
    setIsPlaying(false);
    onRangeChange(null);
  }, [onRangeChange]);

  const handleDotClick = useCallback(
    (index: number) => {
      setIsPlaying(false);
      onRangeChange([index, index]);
    },
    [onRangeChange]
  );

  const handleSpeedChange = useCallback((value: string) => {
    setSpeedMs(Number(value));
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: DragState['mode']) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode,
        startIdx: xToIndex(e.clientX),
        origRange: selectedRange ? [...selectedRange] : [0, 0]
      };
    },
    [selectedRange, xToIndex]
  );

  if (timeBlocks.length === 0) return null;

  const isAllMode = selectedRange === null;
  const rangeLeftPct = selectedRange && maxIdx > 0 ? (selectedRange[0] / maxIdx) * 100 : 0;
  const rangeRightPct = selectedRange && maxIdx > 0 ? ((maxIdx - selectedRange[1]) / maxIdx) * 100 : 0;

  const rangeLabel = isAllMode
    ? 'ALL'
    : selectedRange[0] === selectedRange[1]
      ? timeBlocks[selectedRange[0]]
      : `${timeBlocks[selectedRange[0]]}\u2013${timeBlocks[selectedRange[1]]}`;

  return (
    <div className="border-border bg-background/80 flex h-10 shrink-0 items-center gap-2 border-t px-3">
      {/* ALL toggle */}
      <Button variant={isAllMode ? 'default' : 'outline'} size="sm" className="h-7 px-2 text-xs" onClick={handleAllClick}>
        ALL
      </Button>

      {/* Play/Pause */}
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePlayPause}>
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>

      {/* Speed selector */}
      <Select value={String(speedMs)} onValueChange={handleSpeedChange}>
        <SelectTrigger size="sm" className="h-7 w-16 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCRUBBER2_SPEED_OPTIONS.map(opt => (
            <SelectItem key={opt.ms} value={String(opt.ms)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Time track with dots and range overlay */}
      <div ref={trackRef} className="relative flex min-w-0 flex-1 items-center" style={{ height: 24 }}>
        {/* Connector line */}
        <div className="bg-muted-foreground/30 absolute top-1/2 right-0 left-0 h-px" />

        {/* Range overlay */}
        {selectedRange && (
          <div
            className="bg-primary/15 border-primary/40 absolute top-0 bottom-0 border-y"
            style={{ left: `${rangeLeftPct}%`, right: `${rangeRightPct}%`, minWidth: 4 }}
          >
            {/* Left handle */}
            <div
              className="bg-primary/60 hover:bg-primary absolute top-0 bottom-0 -left-1.5 w-3 cursor-ew-resize rounded-l"
              onPointerDown={e => startDrag(e, 'left')}
            />
            {/* Pan area (middle) */}
            <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onPointerDown={e => startDrag(e, 'pan')} />
            {/* Right handle */}
            <div
              className="bg-primary/60 hover:bg-primary absolute top-0 -right-1.5 bottom-0 w-3 cursor-ew-resize rounded-r"
              onPointerDown={e => startDrag(e, 'right')}
            />
          </div>
        )}

        {/* Dots */}
        {timeBlocks.map((time, i) => {
          const leftPct = maxIdx === 0 ? 50 : (i / maxIdx) * 100;
          const inRange = selectedRange !== null && i >= selectedRange[0] && i <= selectedRange[1];
          return (
            <button
              key={time}
              className={`absolute z-10 h-5 w-3 -translate-x-1/2 rounded-full border-2 transition-all ${
                inRange
                  ? 'bg-primary border-primary scale-110'
                  : 'border-muted-foreground/50 hover:border-primary/70 bg-transparent hover:scale-105'
              }`}
              style={{ left: `${leftPct}%` }}
              onClick={() => handleDotClick(i)}
              title={time}
            />
          );
        })}
      </div>

      {/* Range label */}
      <span className="text-muted-foreground min-w-10 text-right text-xs font-medium whitespace-nowrap">{rangeLabel}</span>
    </div>
  );
};

export default Spreadline2ScrubberComponent;
