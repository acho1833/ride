'use client';

/**
 * Collaboration Timeline Component
 *
 * Displays collaboration timelines for selected nodes.
 * Shows years on x-axis, one row per selected collaborator.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TIMELINE_CONFIG } from '../const';
import { getCollaborationYears, getTierColor } from '../utils';
import type { Collaborator } from '../types';

interface Props {
  selectedIds: string[];
  collaborators: Collaborator[];
  yearRange: [number, number];
}

const CollaborationTimelineComponent = ({ selectedIds, collaborators, yearRange }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (selectedIds.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const { padding, rowHeight, dotRadius, lineWidth } = TIMELINE_CONFIG;

    const height = padding.top + padding.bottom + selectedIds.length * rowHeight;
    const width = containerWidth;

    svg.attr('width', width).attr('height', height);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain(yearRange)
      .range([padding.left, width - padding.right]);

    const yScale = d3
      .scaleBand<string>()
      .domain(selectedIds)
      .range([padding.top, height - padding.bottom])
      .padding(0.3);

    // Draw x-axis (years)
    const years = d3.range(yearRange[0], yearRange[1] + 1);
    const xAxis = d3
      .axisTop(xScale)
      .tickValues(years)
      .tickFormat(d => String(d));

    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${padding.top})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', '10px');

    svg.selectAll('.x-axis path, .x-axis line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.3);

    // Draw grid lines
    svg
      .append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(years)
      .join('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', padding.top)
      .attr('y2', height - padding.bottom)
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.1);

    // Draw each selected collaborator's timeline
    selectedIds.forEach(id => {
      const collaborator = collaborators.find(c => c.id === id);
      if (!collaborator) return;

      const collabYears = getCollaborationYears(collaborator);
      const y = yScale(id)! + yScale.bandwidth() / 2;
      const color = getTierColor(collaborator.collaborations.length);

      // Draw name label
      svg
        .append('text')
        .attr('x', padding.left - 10)
        .attr('y', y)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'currentColor')
        .attr('font-size', '12px')
        .text(collaborator.name.split(' ')[0]); // First name only for space

      // Draw connecting lines between consecutive years
      for (let i = 0; i < collabYears.length - 1; i++) {
        const year1 = collabYears[i];
        const year2 = collabYears[i + 1];

        // Only draw line if years are consecutive
        if (year2 - year1 === 1) {
          svg
            .append('line')
            .attr('x1', xScale(year1))
            .attr('x2', xScale(year2))
            .attr('y1', y)
            .attr('y2', y)
            .attr('stroke', color)
            .attr('stroke-width', lineWidth)
            .attr('stroke-opacity', 0.8);
        }
      }

      // Draw dots for each collaboration year
      svg
        .selectAll(`.dot-${id}`)
        .data(collabYears)
        .join('circle')
        .attr('cx', d => xScale(d))
        .attr('cy', y)
        .attr('r', dotRadius)
        .attr('fill', color);
    });
  }, [selectedIds, collaborators, yearRange]);

  if (selectedIds.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Click nodes to view their collaboration timeline
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto">
      <svg ref={svgRef} className="text-foreground" />
    </div>
  );
};

export default CollaborationTimelineComponent;
