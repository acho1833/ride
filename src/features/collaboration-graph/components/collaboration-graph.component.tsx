'use client';

/**
 * Collaboration Graph Component
 *
 * D3.js force-directed graph for .gx files.
 * Shows collaboration network with timeline panel.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, Minus, Maximize } from 'lucide-react';
import { GRAPH_CONFIG, TARGET_COLOR, SELECTION_COLOR, SELECTION_RING_WIDTH } from '../const';
import { generateDemoData, transformToGraph, getTierColor, getYearRange } from '../utils';
import CollaborationLegendComponent from './collaboration-legend.component';
import CollaborationTimelineComponent from './collaboration-timeline.component';
import type { CollaborationNode, CollaborationLink, CollaborationData } from '../types';

interface Props {
  fileId: string;
  fileName: string;
}

const CollaborationGraphComponent = ({ fileId }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<CollaborationNode[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Generate demo data
  const data = useMemo<CollaborationData>(() => generateDemoData(), [fileId]);
  const yearRange = useMemo(() => getYearRange(data.collaborators), [data]);
  const { nodes: graphNodes, links: graphLinks } = useMemo(() => transformToGraph(data), [data]);

  // Toggle node selection
  const toggleSelection = useCallback((nodeId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(nodeId)) {
        return prev.filter(id => id !== nodeId);
      }
      return [...prev, nodeId];
    });
  }, []);

  // Observe graph container size
  const graphContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!graphContainerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(graphContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize D3 graph
  useEffect(() => {
    if (!svgRef.current || !dimensions) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Deep copy data
    const nodes: CollaborationNode[] = graphNodes.map(n => ({ ...n }));
    const links: CollaborationLink[] = graphLinks.map(l => ({ ...l }));

    // Setup zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(GRAPH_CONFIG.zoomExtent)
      .filter((event: Event) => {
        if (!event) return true;
        return (event as KeyboardEvent).ctrlKey || (event as MouseEvent).ctrlKey;
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Build node-to-links map
    const nodeLinkMap = new Map<string, SVGLineElement[]>();
    nodes.forEach(n => nodeLinkMap.set(n.id, []));

    // Create links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, CollaborationLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1.5);

    link.each(function (d) {
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
      const targetId = typeof d.target === 'string' ? d.target : d.target.id;
      nodeLinkMap.get(sourceId)?.push(this);
      nodeLinkMap.get(targetId)?.push(this);
    });

    // Create node groups
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, CollaborationNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer');

    // Add selection ring (hidden by default)
    node
      .append('circle')
      .attr('class', 'selection-ring')
      .attr('r', d => (d.isTarget ? GRAPH_CONFIG.targetNodeRadius : GRAPH_CONFIG.nodeRadius) + SELECTION_RING_WIDTH + 2)
      .attr('fill', 'none')
      .attr('stroke', SELECTION_COLOR)
      .attr('stroke-width', SELECTION_RING_WIDTH)
      .attr('opacity', 0);

    // Add main circle
    node
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => (d.isTarget ? GRAPH_CONFIG.targetNodeRadius : GRAPH_CONFIG.nodeRadius))
      .attr('fill', d => (d.isTarget ? TARGET_COLOR : getTierColor(d.collaborationCount)))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add count/name text inside node
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-size', d => (d.isTarget ? GRAPH_CONFIG.countFontSize : GRAPH_CONFIG.countFontSize) + 'px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => (d.isTarget ? d.name.split(' ')[0] : d.collaborationCount));

    // Add name label below node
    node
      .filter(d => !d.isTarget)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', GRAPH_CONFIG.nodeRadius + 14)
      .attr('fill', 'currentColor')
      .attr('font-size', GRAPH_CONFIG.labelFontSize + 'px')
      .attr('pointer-events', 'none')
      .text(d => d.name.split(' ')[0]);

    // Target label below
    node
      .filter(d => d.isTarget)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', GRAPH_CONFIG.targetNodeRadius + 14)
      .attr('fill', 'currentColor')
      .attr('font-size', GRAPH_CONFIG.labelFontSize + 'px')
      .attr('pointer-events', 'none')
      .text('(target)');

    // Setup force simulation
    const simulation = d3
      .forceSimulation<CollaborationNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<CollaborationNode, CollaborationLink>(links)
          .id(d => d.id)
          .distance(GRAPH_CONFIG.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(GRAPH_CONFIG.nodeRadius + 20));

    // Run simulation
    simulation.stop();
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    nodesRef.current = nodes;

    // Set zoom to 1.0 and center the graph
    const xExtent = d3.extent(nodes, d => d.x) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y) as [number, number];
    const graphCenterX = (xExtent[0] + xExtent[1]) / 2;
    const graphCenterY = (yExtent[0] + yExtent[1]) / 2;

    // Scale 1.0, translate to center the graph
    const translateX = width / 2 - graphCenterX;
    const translateY = height / 2 - graphCenterY;

    svg.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(1));

    // Set positions
    link
      .attr('x1', d => (d.source as CollaborationNode).x ?? 0)
      .attr('y1', d => (d.source as CollaborationNode).y ?? 0)
      .attr('x2', d => (d.target as CollaborationNode).x ?? 0)
      .attr('y2', d => (d.target as CollaborationNode).y ?? 0);

    node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

    // Tick handler for drag
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as CollaborationNode).x ?? 0)
        .attr('y1', d => (d.source as CollaborationNode).y ?? 0)
        .attr('x2', d => (d.target as CollaborationNode).x ?? 0)
        .attr('y2', d => (d.target as CollaborationNode).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, CollaborationNode>()
      .on('start', function () {
        this.setAttribute('cursor', 'grabbing');
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, CollaborationNode, CollaborationNode>, d) {
        d.x = event.x;
        d.y = event.y;
        this.setAttribute('transform', `translate(${d.x},${d.y})`);

        const connectedLinks = nodeLinkMap.get(d.id);
        if (connectedLinks) {
          for (const linkEl of connectedLinks) {
            const linkData = d3.select<SVGLineElement, CollaborationLink>(linkEl).datum();
            const source = linkData.source as CollaborationNode;
            const target = linkData.target as CollaborationNode;
            linkEl.setAttribute('x1', String(source.x ?? 0));
            linkEl.setAttribute('y1', String(source.y ?? 0));
            linkEl.setAttribute('x2', String(target.x ?? 0));
            linkEl.setAttribute('y2', String(target.y ?? 0));
          }
        }
      })
      .on('end', function () {
        this.setAttribute('cursor', 'pointer');
      });

    node.call(drag);

    // Click handler for selection
    node.on('click', function (event: MouseEvent, d: CollaborationNode) {
      event.stopPropagation();
      if (d.isTarget) return; // Don't select target node

      toggleSelection(d.id);
    });

    return () => {
      simulation.stop();
    };
  }, [graphNodes, graphLinks, dimensions, toggleSelection]);

  // Update selection visuals
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg.selectAll<SVGCircleElement, CollaborationNode>('.selection-ring').attr('opacity', d => (selectedIds.includes(d.id) ? 1 : 0));
  }, [selectedIds]);

  // Zoom controls
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, GRAPH_CONFIG.zoomStep);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 1 / GRAPH_CONFIG.zoomStep);
  };

  const handleZoomToFit = () => {
    if (!svgRef.current || !zoomRef.current || !dimensions) return;

    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    const { width, height } = dimensions;
    const padding = GRAPH_CONFIG.fitPadding;
    const xExtent = d3.extent(nodes, d => d.x) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y) as [number, number];

    const graphWidth = xExtent[1] - xExtent[0] + GRAPH_CONFIG.nodeRadius * 4;
    const graphHeight = yExtent[1] - yExtent[0] + GRAPH_CONFIG.nodeRadius * 4;
    const graphCenterX = (xExtent[0] + xExtent[1]) / 2;
    const graphCenterY = (yExtent[0] + yExtent[1]) / 2;

    const scale = Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight, 1);
    const translateX = width / 2 - graphCenterX * scale;
    const translateY = height / 2 - graphCenterY * scale;

    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  };

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden">
      {/* Legend */}
      <div className="shrink-0 border-b">
        <CollaborationLegendComponent />
      </div>

      {/* Resizable Graph and Timeline */}
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Graph Panel */}
        <ResizablePanel defaultSize={70} minSize={30}>
          <div ref={graphContainerRef} className="relative h-full w-full overflow-hidden">
            <svg ref={svgRef} className="text-foreground absolute inset-0 h-full w-full" />

            {/* Zoom controls */}
            <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomToFit} title="Zoom to Fit">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Timeline Panel */}
        <ResizablePanel defaultSize={30} minSize={15}>
          <div className="h-full w-full overflow-hidden">
            <CollaborationTimelineComponent selectedIds={selectedIds} collaborators={data.collaborators} yearRange={yearRange} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CollaborationGraphComponent;
