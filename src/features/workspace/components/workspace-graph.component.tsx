'use client';

/**
 * Workspace Graph Component
 *
 * D3.js force-directed graph for .ws files.
 * React renders the container once; D3 owns all dynamic updates.
 */

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { debounce } from 'lodash-es';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Maximize } from 'lucide-react';
import { toast } from 'sonner';
import { GRAPH_CONFIG, SELECTION_CONFIG } from '../const';
import { toGraphData, type WorkspaceGraphNode, type WorkspaceGraphLink, type WorkspaceGraphData } from '../types';
import type { Workspace } from '@/models/workspace.model';
import type { WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
import type { Entity } from '@/models/entity.model';
import { ENTITY_ICON_CONFIG } from '@/const';
import { getDraggingEntityId } from '@/features/entity-card/components/entity-card.component';
import EntityDetailPopupComponent from './entity-detail-popup.component';

// Re-export PopupState type from store for convenience
import type { PopupState } from '@/stores/workspace-graph/workspace-graph.store';

/**
 * Convert screen coordinates to SVG graph coordinates.
 * Accounts for SVG position and current zoom/pan transform.
 */
function screenToSvgCoords(
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement,
  transform: d3.ZoomTransform
): { x: number; y: number } {
  const rect = svgElement.getBoundingClientRect();
  const svgX = screenX - rect.left;
  const svgY = screenY - rect.top;

  // Invert the zoom/pan transform
  return {
    x: (svgX - transform.x) / transform.k,
    y: (svgY - transform.y) / transform.k
  };
}

/**
 * Calculate zoom-to-fit transform for given nodes and dimensions.
 */
function calculateFitTransform(nodes: WorkspaceGraphNode[], width: number, height: number): d3.ZoomTransform {
  if (nodes.length === 0) return d3.zoomIdentity;

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

  return d3.zoomIdentity.translate(translateX, translateY).scale(scale);
}

/**
 * Check if a point is inside a rectangle.
 */
function isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

interface Props {
  workspace: Workspace;
  /** Map of entity IDs to entities for O(1) lookups */
  entityMap: Map<string, Entity>;
  /** IDs of currently selected entity nodes (from Zustand store) */
  selectedEntityIds: string[];
  /** Replace the entire selection with the given IDs */
  onSetSelectedEntityIds: (ids: string[]) => void;
  /** Toggle a single entity in/out of the selection */
  onToggleEntitySelection: (id: string) => void;
  /** Clear all selected entities */
  onClearEntitySelection: () => void;
  onSaveViewState: (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => void;
  onAddEntity: (entityId: string, position: { x: number; y: number }) => void;
  /** Called when user right-clicks on graph (entity or canvas) */
  onContextMenu: (event: MouseEvent, entityId?: string) => void;
  /** Called to focus the editor group panel (e.g., on node click) */
  onFocusPanel?: () => void;
  /** Open entity detail popups (from Zustand store) */
  openPopups: PopupState[];
  /** Called to open a popup for an entity */
  onOpenPopup: (popup: PopupState) => void;
  /** Called to close a popup */
  onClosePopup: (popupId: string) => void;
  /** Called to update popup position after drag */
  onUpdatePopupPosition: (popupId: string, svgX: number, svgY: number) => void;
}

const WorkspaceGraphComponent = ({
  workspace,
  entityMap,
  selectedEntityIds = [],
  onSetSelectedEntityIds,
  onToggleEntitySelection,
  onClearEntitySelection,
  onSaveViewState,
  onAddEntity,
  onContextMenu,
  onFocusPanel,
  openPopups,
  onOpenPopup,
  onClosePopup,
  onUpdatePopupPosition
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<WorkspaceGraphNode, WorkspaceGraphLink> | null>(null);
  const nodesRef = useRef<WorkspaceGraphNode[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  // Counter to trigger re-renders for popup position updates on zoom/pan
  const [, setRenderTrigger] = useState(0);

  // Keep a ref of selectedEntityIds so D3 drag handlers always read the latest value
  const selectedEntityIdsRef = useRef<string[]>(selectedEntityIds);
  selectedEntityIdsRef.current = selectedEntityIds;

  // Keep a ref of handleOpenPopup so D3 event handlers always read the latest callback
  const handleOpenPopupRef = useRef<(entityId: string, nodeX: number, nodeY: number) => void>(() => {});

  // Rectangle selection state refs
  const isDraggingSelectionRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const justCompletedDragRef = useRef(false);

  // Track previous node IDs to detect new nodes for smooth transitions
  const prevNodeIdsRef = useRef<Set<string>>(new Set());

  // Convert workspace to graph data
  const data = useMemo<WorkspaceGraphData>(() => toGraphData(workspace), [workspace]);

  // Collect current state and save
  const collectAndSave = useCallback(() => {
    const transform = transformRef.current;
    const positions: Record<string, { x: number; y: number }> = {};

    for (const node of nodesRef.current) {
      if (node.x !== undefined && node.y !== undefined) {
        positions[node.id] = { x: node.x, y: node.y };
      }
    }

    onSaveViewState({
      scale: transform.k,
      panX: transform.x,
      panY: transform.y,
      entityPositions: positions
    });
  }, [onSaveViewState]);

  // Debounced save function
  const debouncedSave = useMemo(() => debounce(collectAndSave, GRAPH_CONFIG.saveDebounceMs), [collectAndSave]);

  /**
   * Gets position for a popup relative to the container.
   * Computes from SVG coordinates stored in state + current transform.
   */
  const getPopupScreenPosition = useCallback((svgX: number, svgY: number): { x: number; y: number } => {
    const transform = transformRef.current;
    // Apply zoom transform: containerPos = svgPos * scale + translate
    return {
      x: svgX * transform.k + transform.x,
      y: svgY * transform.k + transform.y
    };
  }, []);

  /**
   * Opens a popup for an entity at its node's lower-right corner.
   * Adds to store (position stored in SVG coordinates).
   */
  const handleOpenPopup = useCallback(
    (entityId: string, nodeX: number, nodeY: number) => {
      const popupId = `workspace-graph-popup-${entityId}`;

      // Don't add if already open in store
      if (openPopups.some(p => p.id === popupId)) return;

      // Position at lower-right of node
      const anchorX = nodeX + GRAPH_CONFIG.nodeRadius;
      const anchorY = nodeY + GRAPH_CONFIG.nodeRadius;

      onOpenPopup({ id: popupId, entityId, svgX: anchorX, svgY: anchorY });
    },
    [openPopups, onOpenPopup]
  );

  // Update ref so D3 event handlers always use latest callback
  handleOpenPopupRef.current = handleOpenPopup;

  /**
   * Closes a popup by ID.
   */
  const handleClosePopup = useCallback(
    (popupId: string) => {
      onClosePopup(popupId);
    },
    [onClosePopup]
  );

  /**
   * Updates popup position on drag end.
   * Converts final container-relative position to SVG coordinates and updates store.
   * Called once when user releases the drag.
   */
  const handlePopupDragEnd = useCallback(
    (popupId: string, containerX: number, containerY: number) => {
      const transform = transformRef.current;
      // Convert container-relative coords to SVG coords
      const svgX = (containerX - transform.x) / transform.k;
      const svgY = (containerY - transform.y) / transform.k;

      onUpdatePopupPosition(popupId, svgX, svgY);
    },
    [onUpdatePopupPosition]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

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
    // Apply positions: prefer current in-memory positions (nodesRef) over persisted viewState
    // This ensures drag positions aren't lost when graph rebuilds (e.g., on resize)
    const prevNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
    const nodes: WorkspaceGraphNode[] = data.nodes.map(n => {
      const prevNode = prevNodesMap.get(n.id);
      const savedPos = workspace.viewState?.entityPositions[n.id];
      return {
        ...n,
        x: prevNode?.x ?? savedPos?.x ?? n.x,
        y: prevNode?.y ?? savedPos?.y ?? n.y
      };
    });
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
        transformRef.current = event.transform;
        debouncedSave();
        // Force re-render to update popup screen positions
        setRenderTrigger(n => n + 1);
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

    // Add squares to nodes
    node
      .append('rect')
      .attr('x', -GRAPH_CONFIG.nodeRadius)
      .attr('y', -GRAPH_CONFIG.nodeRadius)
      .attr('width', GRAPH_CONFIG.nodeRadius * 2)
      .attr('height', GRAPH_CONFIG.nodeRadius * 2)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', GRAPH_CONFIG.nodeColor)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add entity type icons (centered in square)
    node
      .append('use')
      .attr('href', d => `#entity-icon-${d.type in ENTITY_ICON_CONFIG ? d.type : 'unknown'}`)
      .attr('x', -GRAPH_CONFIG.iconSize / 2)
      .attr('y', -GRAPH_CONFIG.iconSize / 2)
      .attr('width', GRAPH_CONFIG.iconSize)
      .attr('height', GRAPH_CONFIG.iconSize)
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

    // Create selection rectangle (initially hidden, rendered on top of nodes)
    const selectionRect = g
      .append('rect')
      .attr('class', 'selection-rect')
      .attr('fill', SELECTION_CONFIG.rectFill)
      .attr('stroke', SELECTION_CONFIG.rectStroke)
      .attr('stroke-width', SELECTION_CONFIG.rectStrokeWidth)
      .attr('stroke-dasharray', SELECTION_CONFIG.rectStrokeDash)
      .attr('pointer-events', 'none')
      .attr('visibility', 'hidden');

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
    // Skip if we have saved positions - they're already applied to nodes
    simulation.stop();
    if (!workspace.viewState) {
      for (let i = 0; i < 300; i++) {
        simulation.tick();
      }
    }

    simulationRef.current = simulation;
    nodesRef.current = nodes;

    // Apply transform: prefer current in-memory transform over persisted viewState
    // This ensures zoom/pan isn't lost when graph rebuilds (e.g., on resize)
    const hasInMemoryTransform = transformRef.current !== d3.zoomIdentity;
    const initialTransform = hasInMemoryTransform
      ? transformRef.current
      : workspace.viewState
        ? d3.zoomIdentity.translate(workspace.viewState.panX, workspace.viewState.panY).scale(workspace.viewState.scale)
        : calculateFitTransform(nodes, width, height);

    transformRef.current = initialTransform;
    svg.call(zoom.transform, initialTransform);

    // Set initial positions for links and nodes
    link
      .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
      .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
      .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
      .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);

    node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

    // Detect new nodes for smooth position transitions
    const currentNodeIds = new Set(nodes.map(n => n.id));
    const newNodeIds = nodes.filter(n => !prevNodeIdsRef.current.has(n.id)).map(n => n.id);
    const hasNewNodes = newNodeIds.length > 0 && prevNodeIdsRef.current.size > 0;

    if (hasNewNodes) {
      // Find an existing node to use as spawn point
      const existingNode = nodes.find(n => prevNodeIdsRef.current.has(n.id));
      const spawnX = existingNode?.x ?? width / 2;
      const spawnY = existingNode?.y ?? height / 2;

      // Position new nodes at spawn point
      for (const n of nodes) {
        if (newNodeIds.includes(n.id)) {
          n.x = spawnX;
          n.y = spawnY;
        }
      }

      // Update DOM to reflect spawn positions
      node
        .filter(d => newNodeIds.includes(d.id))
        .attr('transform', `translate(${spawnX},${spawnY})`);

      // Fix existing nodes in place so simulation only moves new nodes
      for (const n of nodes) {
        if (prevNodeIdsRef.current.has(n.id)) {
          n.fx = n.x;
          n.fy = n.y;
        }
      }

      // Create a gentle force simulation just for spreading new nodes
      const expandSim = d3
        .forceSimulation<WorkspaceGraphNode>(nodes)
        .force(
          'link',
          d3
            .forceLink<WorkspaceGraphNode, WorkspaceGraphLink>(links)
            .id(d => d.id)
            .distance(GRAPH_CONFIG.linkDistance)
            .strength(0.5)
        )
        .force('collide', d3.forceCollide(GRAPH_CONFIG.nodeRadius * 2))
        .force('charge', d3.forceManyBody().strength(-50))
        .alpha(0.4)
        .alphaDecay(0.06)
        .on('tick', () => {
          // Update positions during animation
          link
            .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
            .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
            .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
            .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);
          node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

          // Stop early when nearly stabilized
          if (expandSim.alpha() < 0.002) {
            expandSim.stop();
            // Unfix existing nodes and save
            for (const n of nodes) {
              n.fx = null;
              n.fy = null;
            }
            debouncedSave();
          }
        })
        .on('end', () => {
          // Unfix existing nodes and save
          for (const n of nodes) {
            n.fx = null;
            n.fy = null;
          }
          debouncedSave();
        });
    }

    // Update previous node IDs for next render
    prevNodeIdsRef.current = currentNodeIds;

    // Update positions on each tick (for drag interactions and new node animation)
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
        .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
        .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
        .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Build node ID → <g> element map for group drag updates
    const nodeElementMap = new Map<string, SVGGElement>();
    node.each(function (d) {
      nodeElementMap.set(d.id, this);
    });

    // Helper: update connected links for a given node
    const updateLinksForNode = (nodeId: string) => {
      const connectedLinks = nodeLinkMap.get(nodeId);
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
    };

    // Setup drag behavior - supports group drag when node is in selection
    const drag = d3
      .drag<SVGGElement, WorkspaceGraphNode>()
      .clickDistance(4) // Allow clicks/dblclicks through if pointer moves less than 4px
      .on('start', function () {
        this.setAttribute('cursor', 'grabbing');
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, WorkspaceGraphNode, WorkspaceGraphNode>, d) {
        const selected = selectedEntityIdsRef.current;
        const isDraggedNodeSelected = selected.includes(d.id);

        if (isDraggedNodeSelected && selected.length > 1) {
          // Group drag: compute delta from dragged node and apply to all selected
          const dx = event.x - (d.x ?? 0);
          const dy = event.y - (d.y ?? 0);

          for (const nodeId of selected) {
            const nodeData = nodes.find(n => n.id === nodeId);
            const nodeEl = nodeElementMap.get(nodeId);
            if (!nodeData || !nodeEl) continue;

            nodeData.x = (nodeData.x ?? 0) + dx;
            nodeData.y = (nodeData.y ?? 0) + dy;
            nodeEl.setAttribute('transform', `translate(${nodeData.x},${nodeData.y})`);
            updateLinksForNode(nodeId);
          }
        } else {
          // Single node drag (original behavior)
          d.x = event.x;
          d.y = event.y;
          this.setAttribute('transform', `translate(${d.x},${d.y})`);
          updateLinksForNode(d.id);
        }
      })
      .on('end', function () {
        this.setAttribute('cursor', 'grab');
        debouncedSave();
      });

    node.call(drag);

    // Left-click on node: single select or ctrl+click toggle
    node.on('click', function (event: MouseEvent, d: WorkspaceGraphNode) {
      event.stopPropagation();
      // Focus the editor group panel when clicking a node
      onFocusPanel?.();
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+click: toggle this node in/out of selection
        onToggleEntitySelection(d.id);
      } else {
        // Regular click: select only this node
        onSetSelectedEntityIds([d.id]);
      }
    });

    // Add right-click handler for context menu
    node.on('contextmenu', function (event: MouseEvent, d: WorkspaceGraphNode) {
      event.preventDefault();
      onContextMenu(event, d.id);
    });

    // Double-click on node: open entity detail popup
    node.on('dblclick', function (event: MouseEvent, d: WorkspaceGraphNode) {
      event.preventDefault();
      event.stopPropagation();
      // Open popup at node's lower-right corner (use ref to avoid stale closure)
      handleOpenPopupRef.current(d.id, d.x ?? 0, d.y ?? 0);
    });

    // Rectangle selection: use native event listeners to avoid D3 zoom interference
    const svgElement = svgRef.current!;

    const handleMouseDown = (event: MouseEvent) => {
      // Only handle left-click without Ctrl (Ctrl+drag is for panning)
      if (event.button !== 0 || event.ctrlKey || event.metaKey) return;

      // Check if clicked on a node (not empty canvas)
      const target = event.target as Element;
      if (target.closest('.nodes g')) return;

      // Store start position in both screen and graph coordinates
      const graphCoords = screenToSvgCoords(event.clientX, event.clientY, svgElement, transformRef.current);
      dragStartRef.current = {
        x: graphCoords.x,
        y: graphCoords.y,
        screenX: event.clientX,
        screenY: event.clientY
      };
      isDraggingSelectionRef.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStartRef.current) return;

      // Calculate screen distance moved
      const dx = event.clientX - dragStartRef.current.screenX;
      const dy = event.clientY - dragStartRef.current.screenY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Start rectangle selection if moved past threshold
      if (!isDraggingSelectionRef.current && distance >= SELECTION_CONFIG.minDragDistance) {
        isDraggingSelectionRef.current = true;
        selectionRect.attr('visibility', 'visible');

        // Clear previous selection visually (without state update yet)
        d3.select(svgElement).selectAll<SVGRectElement, WorkspaceGraphNode>('.nodes g rect').attr('fill', GRAPH_CONFIG.nodeColor);
      }

      // Update rectangle if actively dragging
      if (isDraggingSelectionRef.current) {
        // Clamp mouse coordinates to SVG bounds
        const svgRect = svgElement.getBoundingClientRect();
        const clampedX = Math.max(svgRect.left, Math.min(event.clientX, svgRect.right));
        const clampedY = Math.max(svgRect.top, Math.min(event.clientY, svgRect.bottom));

        const currentCoords = screenToSvgCoords(clampedX, clampedY, svgElement, transformRef.current);

        // Calculate rectangle bounds (handle drag in any direction)
        const rectX = Math.min(dragStartRef.current.x, currentCoords.x);
        const rectY = Math.min(dragStartRef.current.y, currentCoords.y);
        const rectWidth = Math.abs(currentCoords.x - dragStartRef.current.x);
        const rectHeight = Math.abs(currentCoords.y - dragStartRef.current.y);

        selectionRect.attr('x', rectX).attr('y', rectY).attr('width', rectWidth).attr('height', rectHeight);

        // Visual feedback: highlight nodes inside rectangle (without triggering state update)
        const rect = { x: rectX, y: rectY, width: rectWidth, height: rectHeight };
        d3.select(svgElement)
          .selectAll<SVGRectElement, WorkspaceGraphNode>('.nodes g rect')
          .attr('fill', d => {
            const isInRect = isPointInRect(d.x ?? 0, d.y ?? 0, rect);
            return isInRect ? GRAPH_CONFIG.nodeColorSelected : GRAPH_CONFIG.nodeColor;
          });
      }
    };

    const handleMouseUp = () => {
      if (!dragStartRef.current) return;

      const wasDragging = isDraggingSelectionRef.current;

      if (wasDragging) {
        // Complete rectangle selection - use current rect position
        const rectX = parseFloat(selectionRect.attr('x') || '0');
        const rectY = parseFloat(selectionRect.attr('y') || '0');
        const rectWidth = parseFloat(selectionRect.attr('width') || '0');
        const rectHeight = parseFloat(selectionRect.attr('height') || '0');

        // Find all nodes inside the rectangle
        const nodesInRect = nodes.filter(n =>
          isPointInRect(n.x ?? 0, n.y ?? 0, { x: rectX, y: rectY, width: rectWidth, height: rectHeight })
        );
        const selectedIds = nodesInRect.map(n => n.id);

        // Update selection
        onSetSelectedEntityIds(selectedIds);

        // Hide rectangle
        selectionRect.attr('visibility', 'hidden');

        // Prevent click handler from firing
        justCompletedDragRef.current = true;
        setTimeout(() => {
          justCompletedDragRef.current = false;
        }, 0);
      }

      // Reset drag state
      dragStartRef.current = null;
      isDraggingSelectionRef.current = false;
    };

    // Add event listeners
    // Use document for mousemove/mouseup so selection works when mouse goes outside SVG
    svgElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Click on empty canvas: clear selection (only if not completing a drag)
    svg.on('click', function () {
      if (justCompletedDragRef.current) return;
      onClearEntitySelection();
    });

    // Right-click on empty canvas: open context menu without changing selection
    svg.on('contextmenu', function (event: MouseEvent) {
      event.preventDefault();
      onContextMenu(event);
    });

    // Cleanup - note: we don't clear popups here because dimension changes shouldn't close them
    return () => {
      simulation.stop();
      svgElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    data,
    dimensions,
    workspace,
    debouncedSave,
    onSetSelectedEntityIds,
    onToggleEntitySelection,
    onClearEntitySelection,
    onContextMenu,
    onFocusPanel
  ]);

  // Update node colors when selection changes (driven by prop from parent/store)
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGRectElement, WorkspaceGraphNode>('.nodes g rect')
      .attr('fill', d => (selectedEntityIds.includes(d.id) ? GRAPH_CONFIG.nodeColorSelected : GRAPH_CONFIG.nodeColor));
  }, [selectedEntityIds]);

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

    const fitTransform = calculateFitTransform(nodes, dimensions.width, dimensions.height);
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, fitTransform);
  };

  // Handle drag over to accept drops
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Check if dragging entity already exists in workspace
      const draggingId = getDraggingEntityId();
      const entityExists = draggingId ? entityMap.has(draggingId) : false;

      // Show 'none' (not allowed) cursor if entity exists, 'copy' otherwise
      event.dataTransfer.dropEffect = entityExists ? 'none' : 'copy';
    },
    [entityMap]
  );

  // Handle drop of entity cards
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Parse entity data from dataTransfer
      const jsonData = event.dataTransfer.getData('application/json');
      if (!jsonData) return;

      let entity: Entity;
      try {
        entity = JSON.parse(jsonData) as Entity;
      } catch {
        toast.error('Invalid entity data');
        return;
      }

      // Check if entity already exists in workspace (user already saw not-allowed cursor)
      if (entityMap.has(entity.id)) return;

      // Convert screen coordinates to SVG coordinates
      if (!svgRef.current) return;
      const position = screenToSvgCoords(event.clientX, event.clientY, svgRef.current, transformRef.current);

      onAddEntity(entity.id, position);
    },
    [entityMap, onAddEntity]
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" onDragOver={handleDragOver} onDrop={handleDrop}>
      <svg ref={svgRef} className="h-full w-full select-none" />

      {/* Render entity detail popups */}
      {openPopups.map(popup => {
        const entity = entityMap.get(popup.entityId);
        if (!entity) return null;
        const screenPos = getPopupScreenPosition(popup.svgX, popup.svgY);

        return (
          <EntityDetailPopupComponent
            key={popup.id}
            entity={entity}
            x={screenPos.x}
            y={screenPos.y}
            workspace={workspace}
            onClose={() => handleClosePopup(popup.id)}
            onDragEnd={(screenX: number, screenY: number) => handlePopupDragEnd(popup.id, screenX, screenY)}
            onSetSelectedEntityIds={onSetSelectedEntityIds}
          />
        );
      })}

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
