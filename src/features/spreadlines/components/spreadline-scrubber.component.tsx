'use client';

/**
 * Spreadline Time Scrubber Component
 *
 * Horizontal control bar for navigating time blocks in the spreadline visualization.
 * Features: play/pause animation, speed control, clickable time dots, ALL mode toggle.
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SCRUBBER_SPEED_OPTIONS, SCRUBBER_DEFAULT_SPEED_MS } from '@/features/spreadlines/const';

interface Props {
  timeBlocks: string[];
  selectedTime: string | 'ALL';
  onTimeChange: (time: string | 'ALL') => void;
}

const SpreadlineScrubberComponent = ({ timeBlocks, selectedTime, onTimeChange }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(SCRUBBER_DEFAULT_SPEED_MS);
  const selectedTimeRef = useRef(selectedTime);
  useLayoutEffect(() => {
    selectedTimeRef.current = selectedTime;
  }, [selectedTime]);

  // Auto-advance animation loop
  useEffect(() => {
    if (!isPlaying || timeBlocks.length === 0) return;

    const interval = setInterval(() => {
      const current = selectedTimeRef.current;
      if (current === 'ALL') {
        // Start from first time block
        onTimeChange(timeBlocks[0]);
      } else {
        const idx = timeBlocks.indexOf(current);
        const nextIdx = (idx + 1) % timeBlocks.length;
        onTimeChange(timeBlocks[nextIdx]);
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [isPlaying, speedMs, timeBlocks, onTimeChange]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleAllClick = useCallback(() => {
    setIsPlaying(false);
    onTimeChange('ALL');
  }, [onTimeChange]);

  const handleDotClick = useCallback(
    (time: string) => {
      setIsPlaying(false);
      onTimeChange(time);
    },
    [onTimeChange]
  );

  const handleSpeedChange = useCallback((value: string) => {
    setSpeedMs(Number(value));
  }, []);

  if (timeBlocks.length === 0) return null;

  return (
    <div className="border-border bg-background/80 flex h-10 shrink-0 items-center gap-2 border-t px-3">
      {/* ALL toggle */}
      <Button variant={selectedTime === 'ALL' ? 'default' : 'outline'} size="sm" className="h-7 px-2 text-xs" onClick={handleAllClick}>
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
          {SCRUBBER_SPEED_OPTIONS.map(opt => (
            <SelectItem key={opt.ms} value={String(opt.ms)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Time track with dots */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0">
        {timeBlocks.map((time, i) => (
          <div key={time} className="flex items-center">
            <button
              className={`h-3 w-3 rounded-full border-2 transition-all ${
                selectedTime === time
                  ? 'bg-primary border-primary scale-125'
                  : 'border-muted-foreground/50 hover:border-primary/70 bg-transparent hover:scale-110'
              }`}
              onClick={() => handleDotClick(time)}
              title={time}
            />
            {i < timeBlocks.length - 1 && <div className="bg-muted-foreground/30 h-px w-3" />}
          </div>
        ))}
      </div>

      {/* Current time label */}
      <span className="text-muted-foreground w-10 text-right text-xs font-medium">{selectedTime === 'ALL' ? 'ALL' : selectedTime}</span>
    </div>
  );
};

export default SpreadlineScrubberComponent;
