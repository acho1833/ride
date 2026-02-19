'use client';

/**
 * Spreadline Graph Component
 *
 * D3.js force-directed graph for the spreadline co-authorship network.
 * React renders the outer container only; D3 owns all SVG rendering.
 *
 * Architecture:
 *  - Main effect (rawData + dimensions): Full D3 setup — clears SVG, creates elements, zoom, drag
 *  - Time-change effect (selectedTime): D3 data joins — enter/update/exit transitions without re-init
 *  - Hop-aware force layout: shorter links for hop-1, longer for hop-2, radial nudge, collision prevention
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Maximize } from 'lucide-react';
import { GRAPH_CONFIG, DOT_GRID_CONFIG } from '@/features/workspace/const';
import { useSpreadlineRawDataQuery } from '@/features/spreadlines/hooks/useSpreadlineRawDataQuery';
import {
  SPREADLINE_DEFAULT_EGO_ID,
  SPREADLINE_DEFAULT_RELATION_TYPES,
  SPREADLINE_DEFAULT_YEAR_RANGE,
  SPREADLINE_INTERNAL_COLOR,
  SPREADLINE_EXTERNAL_COLOR,
  GRAPH_HOP1_LINK_DISTANCE,
  GRAPH_HOP2_LINK_DISTANCE,
  GRAPH_HOP1_RADIAL_RADIUS,
  GRAPH_HOP2_RADIAL_RADIUS,
  GRAPH_RADIAL_STRENGTH,
  GRAPH_TIME_TRANSITION_MS
} from '@/features/spreadlines/const';
import { transformSpreadlineToGraph, transformSpreadlineToGraphByTimes } from '@/features/spreadlines/utils';
import type { SpreadlineGraphNode, SpreadlineGraphLink } from '@/features/spreadlines/utils';

/** Ego node uses the selected color to visually distinguish it */
const EGO_NODE_COLOR = GRAPH_CONFIG.nodeColorSelected;
/** Ego node is 50% larger than regular nodes */
const EGO_SCALE = 1.5;

/** Get fill color for a node based on its category */
const getNodeFill = (d: SpreadlineGraphNode): string => {
  if (d.isEgo) return EGO_NODE_COLOR;
  if (d.category === 'internal') return SPREADLINE_INTERNAL_COLOR;
  if (d.category === 'external') return SPREADLINE_EXTERNAL_COLOR;
  return GRAPH_CONFIG.nodeColor;
};

/** Get the radius for a node (ego is larger) */
const getNodeRadius = (d: SpreadlineGraphNode): number => (d.isEgo ? GRAPH_CONFIG.nodeRadius * EGO_SCALE : GRAPH_CONFIG.nodeRadius);

/** Get the icon size for a node (ego is larger) */
const getNodeIconSize = (d: SpreadlineGraphNode): number => (d.isEgo ? GRAPH_CONFIG.iconSize * EGO_SCALE : GRAPH_CONFIG.iconSize);

/** Append visual elements (rect, icon, label) to a node <g> selection */
const appendNodeVisuals = (selection: d3.Selection<SVGGElement, SpreadlineGraphNode, SVGGElement, unknown>) => {
  // Rounded rectangle
  selection
    .append('rect')
    .attr('x', d => -getNodeRadius(d))
    .attr('y', d => -getNodeRadius(d))
    .attr('width', d => getNodeRadius(d) * 2)
    .attr('height', d => getNodeRadius(d) * 2)
    .attr('rx', GRAPH_CONFIG.nodeRectRadius)
    .attr('ry', GRAPH_CONFIG.nodeRectRadius)
    .attr('fill', getNodeFill)
    .attr('stroke', GRAPH_CONFIG.linkStroke)
    .attr('stroke-width', d => (d.isEgo ? 3 : GRAPH_CONFIG.linkStrokeWidth))
    .attr('filter', d => (d.isEgo ? 'url(#sl-ego-glow)' : null));

  // Person icon
  selection
    .append('use')
    .attr('href', '#entity-icon-Person')
    .attr('x', d => -getNodeIconSize(d) / 2)
    .attr('y', d => -getNodeIconSize(d) / 2)
    .attr('width', getNodeIconSize)
    .attr('height', getNodeIconSize)
    .attr('fill', 'white');

  // Name label below node
  selection
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => getNodeRadius(d) + GRAPH_CONFIG.labelOffsetY)
    .attr('fill', 'white')
    .attr('font-size', d => (d.isEgo ? '14px' : '12px'))
    .attr('font-weight', d => (d.isEgo ? '600' : 'normal'))
    .attr('pointer-events', 'none')
    .text(d => d.name);
};

/** Compute hop-aware link distance for a single link */
const getHopLinkDistance = (link: SpreadlineGraphLink): number => {
  const source = link.source as SpreadlineGraphNode;
  const target = link.target as SpreadlineGraphNode;
  const srcHop = source.hopDistance ?? 0;
  const tgtHop = target.hopDistance ?? 0;
  const maxHop = Math.max(srcHop, tgtHop);
  return maxHop >= 2 ? GRAPH_HOP2_LINK_DISTANCE : GRAPH_HOP1_LINK_DISTANCE;
};

/** Get radial radius for a node's hop distance */
const getRadialRadius = (d: SpreadlineGraphNode): number => {
  if (d.hopDistance === 0) return 0;
  if (d.hopDistance === 1) return GRAPH_HOP1_RADIAL_RADIUS;
  return GRAPH_HOP2_RADIAL_RADIUS;
};

interface Props {
  selectedTimes?: string[];
}

const SpreadlineGraphComponent = ({ selectedTimes = [] }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<SpreadlineGraphNode[]>([]);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // D3 selection refs for time-change effect
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const simulationRef = useRef<d3.Simulation<SpreadlineGraphNode, SpreadlineGraphLink> | null>(null);
  const nodeLinkMapRef = useRef<Map<string, SVGLineElement[]>>(new Map());

  // Track whether the main effect has initialized the graph
  const initializedRef = useRef(false);

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

  // Observe container size
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

  // ═══════════════════════════════════════════════════════════════════════
  // Main Graph Effect — D3 setup (runs on rawData + dimensions change)
  // Creates SVG structure, zoom, initial nodes/links. Stores refs for
  // the time-change effect to use.
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!svgRef.current || !dimensions || !rawData) return;

    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();

    // SVG defs: dot grid pattern + ego glow filter
    const defs = svg.append('defs');

    const glow = defs
      .append('filter')
      .attr('id', 'sl-ego-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glow
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 6)
      .attr('flood-color', EGO_NODE_COLOR)
      .attr('flood-opacity', 0.6);

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
    gRef.current = g;

    // Background rect with dot grid
    const extent = DOT_GRID_CONFIG.patternExtent;
    g.append('rect')
      .attr('x', -extent / 2)
      .attr('y', -extent / 2)
      .attr('width', extent)
      .attr('height', extent)
      .attr('fill', 'url(#sl-dot-grid-pattern)')
      .attr('pointer-events', 'none');

    // Create empty link and node containers (populated by time-change effect)
    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'nodes');

    // Setup zoom (Ctrl key required)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(GRAPH_CONFIG.zoomExtent)
      .filter((event: Event) => {
        if (!event) return true;
        return (event as KeyboardEvent).ctrlKey || (event as MouseEvent).ctrlKey;
      })
      .wheelDelta((event: WheelEvent) => {
        const direction = event.deltaY > 0 ? -1 : 1;
        return direction * Math.log(GRAPH_CONFIG.zoomStep);
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
        transformRef.current = event.transform;
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Apply saved transform or center
    const hasInMemoryTransform = transformRef.current !== d3.zoomIdentity;
    if (hasInMemoryTransform) {
      svg.call(zoom.transform, transformRef.current);
    }

    initializedRef.current = true;

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [rawData, dimensions]);

  // ═══════════════════════════════════════════════════════════════════════
  // Time-Change Effect — D3 data joins (runs on selectedTimes change)
  // Performs enter/update/exit transitions without re-initializing the graph.
  // Also runs on initial mount after main effect sets up the SVG.
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!gRef.current || !rawData || !dimensions) return;

    const g = gRef.current;
    const { width, height } = dimensions;

    // Stop any running simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    // Compute graph data: empty selectedTimes = ALL mode
    const graphData =
      selectedTimes.length === 0 ? transformSpreadlineToGraph(rawData) : transformSpreadlineToGraphByTimes(rawData, selectedTimes);

    // Preserve positions from existing nodes
    const prevNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
    const nodes: SpreadlineGraphNode[] = graphData.nodes.map(n => {
      const prev = prevNodesMap.get(n.id);
      return { ...n, x: prev?.x ?? n.x, y: prev?.y ?? n.y };
    });
    const links: SpreadlineGraphLink[] = graphData.links.map(l => ({ ...l }));

    const isFirstRender = prevNodesMap.size === 0;

    // ─── D3 Data Join: Links ─────────────────────────────────────────
    const linkJoin = g
      .select<SVGGElement>('.links')
      .selectAll<SVGLineElement, SpreadlineGraphLink>('line')
      .data(links, (d: SpreadlineGraphLink) => {
        const srcId = typeof d.source === 'string' ? d.source : d.source.id;
        const tgtId = typeof d.target === 'string' ? d.target : d.target.id;
        return [srcId, tgtId].sort().join('::');
      });

    // Exit links
    linkJoin.exit().transition().duration(GRAPH_TIME_TRANSITION_MS).attr('stroke-opacity', 0).remove();

    // Enter links
    const linkEnter = linkJoin
      .enter()
      .append('line')
      .attr('stroke', GRAPH_CONFIG.linkStroke)
      .attr('stroke-width', GRAPH_CONFIG.linkStrokeWidth)
      .attr('stroke-opacity', 0);

    linkEnter.transition().duration(GRAPH_TIME_TRANSITION_MS).attr('stroke-opacity', GRAPH_CONFIG.linkStrokeOpacity);

    // Merge
    const linkMerged = linkEnter.merge(linkJoin);

    // ─── D3 Data Join: Nodes ─────────────────────────────────────────
    const nodeJoin = g
      .select<SVGGElement>('.nodes')
      .selectAll<SVGGElement, SpreadlineGraphNode>('g')
      .data(nodes, (d: SpreadlineGraphNode) => d.id);

    // Exit nodes
    nodeJoin
      .exit()
      .transition()
      .duration(GRAPH_TIME_TRANSITION_MS)
      .style('opacity', 0)
      .attr('transform', d => {
        const nd = d as SpreadlineGraphNode;
        return `translate(${nd.x ?? 0},${nd.y ?? 0}) scale(0.3)`;
      })
      .remove();

    // Enter nodes — start transparent, positioned near ego or center
    const egoNode = prevNodesMap.get(rawData.egoId);
    const spawnX = egoNode?.x ?? width / 2;
    const spawnY = egoNode?.y ?? height / 2;

    const nodeEnter = nodeJoin
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .style('opacity', 0)
      .attr('transform', d => {
        const x = d.x ?? spawnX;
        const y = d.y ?? spawnY;
        return `translate(${x},${y})`;
      });

    appendNodeVisuals(nodeEnter);

    nodeEnter.transition().duration(GRAPH_TIME_TRANSITION_MS).style('opacity', 1);

    // Update existing nodes — update fill color for category changes
    nodeJoin.select('rect').transition().duration(GRAPH_TIME_TRANSITION_MS).attr('fill', getNodeFill);

    // Merge
    const nodeMerged = nodeEnter.merge(nodeJoin);

    // ─── Build node-link map for drag ──────────────────────────────────
    const nodeLinkMap = new Map<string, SVGLineElement[]>();
    nodes.forEach(n => nodeLinkMap.set(n.id, []));

    linkMerged.each(function (d) {
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
      const targetId = typeof d.target === 'string' ? d.target : d.target.id;
      nodeLinkMap.get(sourceId)?.push(this);
      nodeLinkMap.get(targetId)?.push(this);
    });
    nodeLinkMapRef.current = nodeLinkMap;

    // ─── Drag behavior ─────────────────────────────────────────────────
    const drag = d3
      .drag<SVGGElement, SpreadlineGraphNode>()
      .on('start', function () {
        this.setAttribute('cursor', 'grabbing');
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, SpreadlineGraphNode, SpreadlineGraphNode>, d) {
        d.x = event.x;
        d.y = event.y;
        this.setAttribute('transform', `translate(${d.x},${d.y})`);

        const connectedLinks = nodeLinkMapRef.current.get(d.id);
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

    nodeMerged.call(drag);

    // ─── Force Simulation ──────────────────────────────────────────────
    const useHopLayout = selectedTimes.length > 0;

    const simulation = d3
      .forceSimulation<SpreadlineGraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SpreadlineGraphNode, SpreadlineGraphLink>(links)
          .id(d => d.id)
          .distance(useHopLayout ? getHopLinkDistance : GRAPH_CONFIG.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<SpreadlineGraphNode>().radius(d => getNodeRadius(d) + GRAPH_CONFIG.collisionPadding)
      );

    // Add radial force for hop-aware layout
    if (useHopLayout) {
      simulation.force(
        'radial',
        d3.forceRadial<SpreadlineGraphNode>(getRadialRadius, width / 2, height / 2).strength(GRAPH_RADIAL_STRENGTH)
      );
    }

    // Run simulation
    simulation.stop();
    if (isFirstRender) {
      // First render: synchronous layout
      for (let i = 0; i < GRAPH_CONFIG.initialLayoutTicks; i++) {
        simulation.tick();
      }

      // Set initial positions
      linkMerged
        .attr('x1', d => (d.source as SpreadlineGraphNode).x ?? 0)
        .attr('y1', d => (d.source as SpreadlineGraphNode).y ?? 0)
        .attr('x2', d => (d.target as SpreadlineGraphNode).x ?? 0)
        .attr('y2', d => (d.target as SpreadlineGraphNode).y ?? 0);
      nodeMerged.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

      // Auto-center on first render
      if (transformRef.current === d3.zoomIdentity) {
        const xExt = d3.extent(nodes, d => d.x) as [number, number];
        const yExt = d3.extent(nodes, d => d.y) as [number, number];
        const cx = (xExt[0] + xExt[1]) / 2;
        const cy = (yExt[0] + yExt[1]) / 2;
        const t = d3.zoomIdentity.translate(width / 2 - cx, height / 2 - cy).scale(1);
        transformRef.current = t;
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current).call(zoomRef.current.transform, t);
        }
      }
    } else {
      // Position new nodes near ego (existing nodes keep inherited positions)
      for (const n of nodes) {
        if (!prevNodesMap.has(n.id)) {
          n.x = spawnX + (Math.random() - 0.5) * 40;
          n.y = spawnY + (Math.random() - 0.5) * 40;
        }
      }

      // Animated simulation — all nodes free to move so hop forces take effect
      simulation
        .alpha(0.5)
        .alphaDecay(0.05)
        .on('tick', () => {
          linkMerged
            .attr('x1', d => (d.source as SpreadlineGraphNode).x ?? 0)
            .attr('y1', d => (d.source as SpreadlineGraphNode).y ?? 0)
            .attr('x2', d => (d.target as SpreadlineGraphNode).x ?? 0)
            .attr('y2', d => (d.target as SpreadlineGraphNode).y ?? 0);
          nodeMerged.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
        })
        .restart();
    }

    nodesRef.current = nodes;
    simulationRef.current = simulation;
  }, [selectedTimes, rawData, dimensions]);

  // ═══════════════════════════════════════════════════════════════════════
  // Zoom Controls
  // ═══════════════════════════════════════════════════════════════════════
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
