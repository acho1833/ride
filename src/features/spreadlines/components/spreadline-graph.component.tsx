'use client';

/**
 * Spreadline Graph Component
 *
 * D3.js force-directed graph for the spreadline co-authorship network.
 * Shows ego (Jeffrey Heer) at center with collaborators around.
 * Visual style matches the workspace (.ws) graph.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Maximize } from 'lucide-react';
import { GRAPH_CONFIG, DOT_GRID_CONFIG } from '@/features/workspace/const';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import { SPREADLINE_DEFAULT_EGO_ID, SPREADLINE_DEFAULT_RELATION_TYPES, SPREADLINE_DEFAULT_YEAR_RANGE } from '@/features/spreadlines/const';
import { transformSpreadlineToGraph } from '@/features/spreadlines/utils';
import type { SpreadlineGraphNode, SpreadlineGraphLink } from '@/features/spreadlines/utils';

/** Ego node uses the selected color to visually distinguish it */
const EGO_NODE_COLOR = GRAPH_CONFIG.nodeColorSelected;

const SpreadlineGraphComponent = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<SpreadlineGraphNode[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Fetch data (same query as SpreadlineComponent — React Query deduplicates)
  const {
    data: rawData,
    isPending,
    isError,
    error
  } = useSpreadlineRawDataQuery({
    egoId: SPREADLINE_DEFAULT_EGO_ID,
    relationTypes: SPREADLINE_DEFAULT_RELATION_TYPES,
    yearRange: SPREADLINE_DEFAULT_YEAR_RANGE
  });

  // Transform to graph format
  const graphData = useMemo(() => (rawData ? transformSpreadlineToGraph(rawData) : null), [rawData]);

  // Observe container size
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize D3 graph
  useEffect(() => {
    if (!svgRef.current || !dimensions || !graphData) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll('*').remove();

    // Dot grid background pattern (matching .ws style)
    const defs = svg.append('defs');
    defs
      .append('pattern')
      .attr('id', 'sl-dot-grid-pattern')
      .attr('width', DOT_GRID_CONFIG.spacing)
      .attr('height', DOT_GRID_CONFIG.spacing)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('circle')
      .attr('cx', DOT_GRID_CONFIG.spacing / 2)
      .attr('cy', DOT_GRID_CONFIG.spacing / 2)
      .attr('r', DOT_GRID_CONFIG.dotRadius)
      .attr('fill', DOT_GRID_CONFIG.dotColor);

    const g = svg.append('g');

    // Background rect with dot grid
    const extent = DOT_GRID_CONFIG.patternExtent;
    g.append('rect')
      .attr('x', -extent / 2)
      .attr('y', -extent / 2)
      .attr('width', extent)
      .attr('height', extent)
      .attr('fill', 'url(#sl-dot-grid-pattern)')
      .attr('pointer-events', 'none');

    // Deep copy data
    const nodes: SpreadlineGraphNode[] = graphData.nodes.map(n => ({ ...n }));
    const links: SpreadlineGraphLink[] = graphData.links.map(l => ({ ...l }));

    // Setup zoom (Ctrl key required)
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

    // Build node-to-links map for efficient drag updates
    const nodeLinkMap = new Map<string, SVGLineElement[]>();
    nodes.forEach(n => nodeLinkMap.set(n.id, []));

    // Create links (white stroke matching .ws style)
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, SpreadlineGraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', GRAPH_CONFIG.linkStroke)
      .attr('stroke-opacity', GRAPH_CONFIG.linkStrokeOpacity)
      .attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth);

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
      .selectAll<SVGGElement, SpreadlineGraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer');

    // Rounded rectangle (matching .ws style)
    node
      .append('rect')
      .attr('x', -GRAPH_CONFIG.nodeRadius)
      .attr('y', -GRAPH_CONFIG.nodeRadius)
      .attr('width', GRAPH_CONFIG.nodeRadius * 2)
      .attr('height', GRAPH_CONFIG.nodeRadius * 2)
      .attr('rx', GRAPH_CONFIG.nodeRectRadius)
      .attr('ry', GRAPH_CONFIG.nodeRectRadius)
      .attr('fill', d => (d.isEgo ? EGO_NODE_COLOR : GRAPH_CONFIG.nodeColor))
      .attr('stroke', GRAPH_CONFIG.linkStroke)
      .attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth);

    // Person icon inside node (uses global EntityIconProvider symbols)
    node
      .append('use')
      .attr('href', '#entity-icon-Person')
      .attr('x', -GRAPH_CONFIG.iconSize / 2)
      .attr('y', -GRAPH_CONFIG.iconSize / 2)
      .attr('width', GRAPH_CONFIG.iconSize)
      .attr('height', GRAPH_CONFIG.iconSize)
      .attr('fill', 'white');

    // Name label below node (white text, 12px, matching .ws style)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', GRAPH_CONFIG.nodeRadius + GRAPH_CONFIG.labelOffsetY)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none')
      .text(d => d.name);

    // Setup force simulation
    const simulation = d3
      .forceSimulation<SpreadlineGraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SpreadlineGraphNode, SpreadlineGraphLink>(links)
          .id(d => d.id)
          .distance(GRAPH_CONFIG.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(GRAPH_CONFIG.nodeRadius + GRAPH_CONFIG.collisionPadding));

    // Run simulation synchronously
    simulation.stop();
    for (let i = 0; i < GRAPH_CONFIG.initialLayoutTicks; i++) {
      simulation.tick();
    }

    nodesRef.current = nodes;

    // Center the graph
    const xExtent = d3.extent(nodes, d => d.x) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y) as [number, number];
    const graphCenterX = (xExtent[0] + xExtent[1]) / 2;
    const graphCenterY = (yExtent[0] + yExtent[1]) / 2;
    const translateX = width / 2 - graphCenterX;
    const translateY = height / 2 - graphCenterY;

    svg.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(1));

    // Set positions
    link
      .attr('x1', d => (d.source as SpreadlineGraphNode).x ?? 0)
      .attr('y1', d => (d.source as SpreadlineGraphNode).y ?? 0)
      .attr('x2', d => (d.target as SpreadlineGraphNode).x ?? 0)
      .attr('y2', d => (d.target as SpreadlineGraphNode).y ?? 0);

    node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

    // Tick handler for drag
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SpreadlineGraphNode).x ?? 0)
        .attr('y1', d => (d.source as SpreadlineGraphNode).y ?? 0)
        .attr('x2', d => (d.target as SpreadlineGraphNode).x ?? 0)
        .attr('y2', d => (d.target as SpreadlineGraphNode).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, SpreadlineGraphNode>()
      .on('start', function () {
        this.setAttribute('cursor', 'grabbing');
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, SpreadlineGraphNode, SpreadlineGraphNode>, d) {
        d.x = event.x;
        d.y = event.y;
        this.setAttribute('transform', `translate(${d.x},${d.y})`);

        const connectedLinks = nodeLinkMap.get(d.id);
        if (connectedLinks) {
          for (const linkEl of connectedLinks) {
            const linkData = d3.select<SVGLineElement, SpreadlineGraphLink>(linkEl).datum();
            const source = linkData.source as SpreadlineGraphNode;
            const target = linkData.target as SpreadlineGraphNode;
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

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(GRAPH_CONFIG.zoomAnimationMs).call(zoomRef.current.scaleBy, GRAPH_CONFIG.zoomStep);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(GRAPH_CONFIG.zoomAnimationMs)
      .call(zoomRef.current.scaleBy, 1 / GRAPH_CONFIG.zoomStep);
  }, []);

  const handleZoomToFit = useCallback(() => {
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
    const fitTranslateX = width / 2 - graphCenterX * scale;
    const fitTranslateY = height / 2 - graphCenterY * scale;

    d3.select(svgRef.current)
      .transition()
      .duration(GRAPH_CONFIG.zoomAnimationMs)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(fitTranslateX, fitTranslateY).scale(scale));
  }, [dimensions]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {isPending ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
            <div className="text-muted-foreground text-sm">Loading graph data...</div>
          </div>
        </div>
      ) : isError ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-destructive text-sm">{error?.message ?? 'Failed to load graph data'}</div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default SpreadlineGraphComponent;
