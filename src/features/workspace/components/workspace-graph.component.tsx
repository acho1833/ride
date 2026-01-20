'use client';

/**
 * Workspace Graph Component
 *
 * D3.js force-directed graph for .ws files.
 * React renders the container once; D3 owns all dynamic updates.
 */

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { Plus, Minus, Maximize, Copy, ClipboardPaste, Trash2, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { GRAPH_CONFIG } from '../const';
import { toGraphData, type WorkspaceGraphNode, type WorkspaceGraphLink, type WorkspaceGraphData } from '../types';
import type { Workspace } from '@/models/workspace.model';
import { ENTITY_ICON_CONFIG } from '@/const';

interface Props {
  workspace: Workspace;
}

const WorkspaceGraphComponent = ({ workspace }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<WorkspaceGraphNode, WorkspaceGraphLink> | null>(null);
  const nodesRef = useRef<WorkspaceGraphNode[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<WorkspaceGraphNode | null>(null);
  const contextMenuOpenRef = useRef(false);
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);
  const handleNodeContextMenuRef = useRef<(event: MouseEvent, node: WorkspaceGraphNode) => void>(() => {});

  // Convert workspace to graph data
  const data = useMemo<WorkspaceGraphData>(() => toGraphData(workspace), [workspace]);

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

  // Initialize D3 graph when dimensions are available
  useEffect(() => {
    if (!svgRef.current || !dimensions) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan transforms
    const g = svg.append('g');

    // Deep copy data to avoid mutation issues with D3
    const nodes: WorkspaceGraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: WorkspaceGraphLink[] = data.links.map(l => ({ ...l }));

    // Setup zoom behavior (only active when Ctrl key is held)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(GRAPH_CONFIG.zoomExtent)
      .filter((event: Event) => {
        // Allow programmatic zoom (no sourceEvent) or Ctrl+wheel/drag
        if (!event) return true;
        return (event as KeyboardEvent).ctrlKey || (event as MouseEvent).ctrlKey;
      })
      .wheelDelta((event: WheelEvent) => {
        // Smaller zoom increment per wheel tick (matches button behavior)
        const direction = event.deltaY > 0 ? -1 : 1;
        return direction * Math.log(GRAPH_CONFIG.zoomStep);
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Build node-to-links map for fast lookup during drag
    const nodeLinkMap = new Map<string, SVGLineElement[]>();
    nodes.forEach(n => nodeLinkMap.set(n.id, []));

    // Create links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, WorkspaceGraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'white')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Register link elements with nodes for fast lookup during drag
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
      .selectAll<SVGGElement, WorkspaceGraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab');

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', GRAPH_CONFIG.nodeRadius)
      .attr('fill', 'hsl(210, 70%, 50%)')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add entity type icons (centered in circle)
    node
      .append('use')
      .attr('href', d => `#entity-icon-${d.type in ENTITY_ICON_CONFIG ? d.type : 'unknown'}`)
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', 'white');

    // Add labels to nodes (white text)
    node
      .append('text')
      .text(d => d.labelNormalized)
      .attr('text-anchor', 'middle')
      .attr('dy', GRAPH_CONFIG.nodeRadius + 14)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    // Setup force simulation
    const simulation = d3
      .forceSimulation<WorkspaceGraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<WorkspaceGraphNode, WorkspaceGraphLink>(links)
          .id(d => d.id)
          .distance(GRAPH_CONFIG.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(GRAPH_CONFIG.nodeRadius + 10));

    // Run simulation synchronously to calculate initial positions
    simulation.stop();
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    simulationRef.current = simulation;
    nodesRef.current = nodes;

    // Calculate zoom-to-fit transform
    const padding = GRAPH_CONFIG.fitPadding;
    const xExtent = d3.extent(nodes, d => d.x) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y) as [number, number];

    const graphWidth = xExtent[1] - xExtent[0] + GRAPH_CONFIG.nodeRadius * 2;
    const graphHeight = yExtent[1] - yExtent[0] + GRAPH_CONFIG.nodeRadius * 2;
    const graphCenterX = (xExtent[0] + xExtent[1]) / 2;
    const graphCenterY = (yExtent[0] + yExtent[1]) / 2;

    const scale = Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight, 1);

    const translateX = width / 2 - graphCenterX * scale;
    const translateY = height / 2 - graphCenterY * scale;

    // Apply zoom-to-fit transform immediately (no transition)
    svg.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));

    // Set initial positions for links and nodes
    link
      .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
      .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
      .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
      .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);

    node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

    // Update positions on each tick (for drag interactions)
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
        .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
        .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
        .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Setup drag behavior - only moves the dragged node, no simulation restart
    const drag = d3
      .drag<SVGGElement, WorkspaceGraphNode>()
      .on('start', function () {
        // 'this' is the <g> element the drag is attached to
        this.setAttribute('cursor', 'grabbing');
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, WorkspaceGraphNode, WorkspaceGraphNode>, d) {
        // Update node position directly
        d.x = event.x;
        d.y = event.y;

        // Update the node's visual position (direct DOM manipulation)
        // 'this' is the <g> element
        this.setAttribute('transform', `translate(${d.x},${d.y})`);

        // Update connected links using pre-computed map (direct DOM manipulation)
        const connectedLinks = nodeLinkMap.get(d.id);
        if (connectedLinks) {
          for (const linkEl of connectedLinks) {
            const linkData = d3.select<SVGLineElement, WorkspaceGraphLink>(linkEl).datum();
            const source = linkData.source as WorkspaceGraphNode;
            const target = linkData.target as WorkspaceGraphNode;
            linkEl.setAttribute('x1', String(source.x ?? 0));
            linkEl.setAttribute('y1', String(source.y ?? 0));
            linkEl.setAttribute('x2', String(target.x ?? 0));
            linkEl.setAttribute('y2', String(target.y ?? 0));
          }
        }
      })
      .on('end', function () {
        this.setAttribute('cursor', 'grab');
      });

    node.call(drag);

    // Add right-click handler for context menu
    node.on('contextmenu', function (event: MouseEvent, d: WorkspaceGraphNode) {
      handleNodeContextMenuRef.current(event, d);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, dimensions]);

  // Zoom control handlers
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

    const graphWidth = xExtent[1] - xExtent[0] + GRAPH_CONFIG.nodeRadius * 2;
    const graphHeight = yExtent[1] - yExtent[0] + GRAPH_CONFIG.nodeRadius * 2;
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

  // Context menu handlers
  const handleCopy = useCallback(() => {
    toast.info(`Copy: ${contextMenuNode?.labelNormalized ?? 'Unknown'}`);
  }, [contextMenuNode]);

  const handlePaste = useCallback(() => {
    toast.info(`Paste: ${contextMenuNode?.labelNormalized ?? 'Unknown'}`);
  }, [contextMenuNode]);

  const handleDelete = useCallback(() => {
    toast.info(`Delete: ${contextMenuNode?.labelNormalized ?? 'Unknown'}`);
  }, [contextMenuNode]);

  const handleSpreadline = useCallback(() => {
    toast.info(`Analytics > Spreadline: ${contextMenuNode?.labelNormalized ?? 'Unknown'}`);
  }, [contextMenuNode]);

  // Handle right-click on nodes to open context menu
  handleNodeContextMenuRef.current = (event: MouseEvent, node: WorkspaceGraphNode) => {
    event.preventDefault();

    const openMenu = () => {
      setContextMenuNode(node);
      if (contextMenuTriggerRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          // Position the invisible trigger at the mouse location
          contextMenuTriggerRef.current.style.left = `${event.clientX - rect.left}px`;
          contextMenuTriggerRef.current.style.top = `${event.clientY - rect.top}px`;
          // Dispatch contextmenu event to open the Radix context menu
          contextMenuTriggerRef.current.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              clientX: event.clientX,
              clientY: event.clientY
            })
          );
        }
      }
    };

    // If menu is already open, close it first then reopen at new position
    if (contextMenuOpenRef.current) {
      // Dispatch Escape to close the menu
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      setTimeout(openMenu, 150);
    } else {
      openMenu();
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg ref={svgRef} className="h-full w-full" />

      {/* Context menu for nodes */}
      <ContextMenu onOpenChange={open => (contextMenuOpenRef.current = open)}>
        <ContextMenuTrigger asChild>
          <div ref={contextMenuTriggerRef} className="pointer-events-none absolute h-1 w-1" />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={handlePaste}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              <ContextMenuItem onClick={handleSpreadline}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Spreadline
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>

      {/* Control buttons - lower right */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2">
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
  );
};

export default WorkspaceGraphComponent;
