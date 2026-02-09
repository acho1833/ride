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
import { GRAPH_CONFIG, SELECTION_CONFIG, PREVIEW_CONFIG, PLACEMENT_CONFIG, CULLING_CONFIG, MINIMAP_CONFIG } from '../const';
import { calculateEntityPositions } from '../utils/coordinate-placement.utils';
import { toGraphData, type WorkspaceGraphNode, type WorkspaceGraphLink, type WorkspaceGraphData, type PreviewState } from '../types';
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
  /** Preview state for 1-hop preview mode */
  previewState?: PreviewState | null;
  /** Called when user Shift+Clicks on an entity node */
  onAltClick?: (entityId: string, position: { x: number; y: number }) => void;
  /** Called to add a preview entity to the graph */
  onPreviewAddEntity?: (entityId: string, position: { x: number; y: number }) => void;
  /** Called when a preview group is clicked (opens popup) */
  onPreviewGroupClick?: (groupType: string, screenPosition: { x: number; y: number }) => void;
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
  onUpdatePopupPosition,
  previewState,
  onAltClick,
  onPreviewAddEntity,
  onPreviewGroupClick
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<WorkspaceGraphNode, WorkspaceGraphLink> | null>(null);
  const nodesRef = useRef<WorkspaceGraphNode[]>([]);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  // Counter to trigger re-renders for popup position updates on zoom/pan and minimap
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Keep a ref of selectedEntityIds so D3 drag handlers always read the latest value
  const selectedEntityIdsRef = useRef<string[]>(selectedEntityIds);
  selectedEntityIdsRef.current = selectedEntityIds;

  // Keep a ref of handleOpenPopup so D3 event handlers always read the latest callback
  const handleOpenPopupRef = useRef<(entityId: string, nodeX: number, nodeY: number) => void>(() => {});

  // Rectangle selection state refs
  const isDraggingSelectionRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const justCompletedDragRef = useRef(false);
  const justAltClickedRef = useRef(false);

  // Track previous node IDs to detect new nodes for smooth transitions
  const prevNodeIdsRef = useRef<Set<string>>(new Set());

  // Preview force simulation ref for cleanup
  const previewSimulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  // Track animating items so cleanup can cache their positions before stopping
  const previewAnimatingRef = useRef<Map<string, { x: number; y: number; sourcePos: { x: number; y: number } }>>(new Map());

  // Preview mode refs - keep refs so D3 handlers can access latest values
  const previewStateRef = useRef<PreviewState | null>(null);
  previewStateRef.current = previewState ?? null;
  const onAltClickRef = useRef(onAltClick);
  onAltClickRef.current = onAltClick;
  const onPreviewAddEntityRef = useRef(onPreviewAddEntity);
  onPreviewAddEntityRef.current = onPreviewAddEntity;
  const onPreviewGroupClickRef = useRef(onPreviewGroupClick);
  onPreviewGroupClickRef.current = onPreviewGroupClick;

  // Cache for preview items: position + initialized flag
  // Once initialized (force layout run + animated), item won't be re-processed
  const previewCacheRef = useRef<Map<string, { x: number; y: number; sourceX: number; sourceY: number; initialized: boolean }>>(new Map());

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

  // Observe container size (debounced to avoid rebuilding graph during resize drag)
  useEffect(() => {
    if (!containerRef.current) return;

    let resizeTimeout: NodeJS.Timeout | null = null;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // Debounce dimension updates to avoid rapid rebuilds during resize
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            setDimensions({ width, height });
          }, 100);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
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
        scheduleViewportCulling();
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
      .attr('cursor', 'grab')
      .attr('data-entity-id', d => d.id);

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

    // Compute relationship counts per node (for culling badges)
    const nodeRelCounts = new Map<string, number>();
    for (const l of links) {
      const srcId = typeof l.source === 'string' ? l.source : l.source.id;
      const tgtId = typeof l.target === 'string' ? l.target : l.target.id;
      nodeRelCounts.set(srcId, (nodeRelCounts.get(srcId) ?? 0) + 1);
      nodeRelCounts.set(tgtId, (nodeRelCounts.get(tgtId) ?? 0) + 1);
    }

    // Append culling badge to each node (hidden by default, shown when links are culled)
    node
      .append('g')
      .attr('class', 'cull-badge')
      .attr('display', 'none')
      .each(function () {
        const badge = d3.select(this);
        badge
          .append('circle')
          .attr('cx', GRAPH_CONFIG.nodeRadius)
          .attr('cy', -GRAPH_CONFIG.nodeRadius)
          .attr('r', 7)
          .attr('fill', GRAPH_CONFIG.nodeColor)
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5);
        badge
          .append('text')
          .attr('x', GRAPH_CONFIG.nodeRadius)
          .attr('y', -GRAPH_CONFIG.nodeRadius)
          .attr('text-anchor', 'middle')
          .attr('dy', '3')
          .attr('fill', 'white')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold');
      });

    // Set badge text (total relationship count)
    node.select('.cull-badge text').text(d => {
      const count = nodeRelCounts.get(d.id) ?? 0;
      return count > 1000 ? '1k+' : String(count);
    });

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

    // --- Viewport culling (quadtree + diff-based) ---
    const cullingEnabled = nodes.length >= CULLING_CONFIG.nodeThreshold;
    let cullingRafId: number | null = null;

    // Build node element map early for culling (also used later for drag)
    const cullingNodeElements = new Map<string, SVGGElement>();
    node.each(function (d) {
      cullingNodeElements.set(d.id, this);
    });

    // Spatial index for O(log n) viewport queries
    const quadtree = d3
      .quadtree<WorkspaceGraphNode>()
      .x(d => d.x ?? 0)
      .y(d => d.y ?? 0)
      .addAll(nodes);

    // Track previous visible sets for diff-based updates
    // Initialize prevVisibleNodeIds with ALL nodes so the first diff pass
    // correctly hides off-screen nodes (treats them as "newly hidden")
    const prevVisibleNodeIds = new Set<string>(nodes.map(n => n.id));
    const visibleNodeIds = new Set<string>();

    const updateViewportCulling = () => {
      if (!cullingEnabled) return;

      const t = transformRef.current;
      const pad = CULLING_CONFIG.viewportPadding;
      const minX = -t.x / t.k - pad;
      const minY = -t.y / t.k - pad;
      const maxX = (width - t.x) / t.k + pad;
      const maxY = (height - t.y) / t.k + pad;

      // Query quadtree for visible nodes — O(log n + visible)
      visibleNodeIds.clear();
      quadtree.visit((quadNode, x0, y0, x1, y1) => {
        // If this quadrant doesn't overlap viewport, skip entire subtree
        if (x0 > maxX || x1 < minX || y0 > maxY || y1 < minY) return true;
        // Check leaf nodes
        if (!quadNode.length) {
          let leaf: d3.QuadtreeLeaf<WorkspaceGraphNode> | undefined = quadNode as d3.QuadtreeLeaf<WorkspaceGraphNode>;
          do {
            const d = leaf.data;
            const x = d.x ?? 0;
            const y = d.y ?? 0;
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
              visibleNodeIds.add(d.id);
            }
          } while ((leaf = (leaf as any).next));
        }
        return false;
      });

      // Diff: only touch DOM elements that changed state
      // Newly visible nodes
      for (const id of visibleNodeIds) {
        if (!prevVisibleNodeIds.has(id)) {
          cullingNodeElements.get(id)?.setAttribute('display', '');
        }
      }
      // Newly hidden nodes
      for (const id of prevVisibleNodeIds) {
        if (!visibleNodeIds.has(id)) {
          cullingNodeElements.get(id)?.setAttribute('display', 'none');
        }
      }

      // Update links only for nodes that changed visibility
      const changedNodeIds = new Set<string>();
      for (const id of visibleNodeIds) {
        if (!prevVisibleNodeIds.has(id)) changedNodeIds.add(id);
      }
      for (const id of prevVisibleNodeIds) {
        if (!visibleNodeIds.has(id)) changedNodeIds.add(id);
      }

      for (const nodeId of changedNodeIds) {
        const connectedLinks = nodeLinkMap.get(nodeId) ?? [];
        for (const linkEl of connectedLinks) {
          const linkData = d3.select<SVGLineElement, WorkspaceGraphLink>(linkEl).datum();
          const srcId = typeof linkData.source === 'string' ? linkData.source : (linkData.source as WorkspaceGraphNode).id;
          const tgtId = typeof linkData.target === 'string' ? linkData.target : (linkData.target as WorkspaceGraphNode).id;
          linkEl.setAttribute('display', visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId) ? '' : 'none');
        }
      }

      // Update badges only for nodes that changed visibility
      for (const nodeId of changedNodeIds) {
        if (!visibleNodeIds.has(nodeId)) continue; // Hidden nodes don't need badge updates
        const totalRels = nodeRelCounts.get(nodeId) ?? 0;
        if (totalRels === 0) continue;

        const el = cullingNodeElements.get(nodeId);
        if (!el) continue;

        const connectedLinks = nodeLinkMap.get(nodeId) ?? [];
        let visibleLinkCount = 0;
        for (const linkEl of connectedLinks) {
          if (linkEl.getAttribute('display') !== 'none') visibleLinkCount++;
        }

        d3.select(el)
          .select('.cull-badge')
          .attr('display', visibleLinkCount < totalRels ? '' : 'none');
      }

      // Also update badges for visible nodes whose neighbors changed
      for (const nodeId of changedNodeIds) {
        const connectedLinks = nodeLinkMap.get(nodeId) ?? [];
        for (const linkEl of connectedLinks) {
          const linkData = d3.select<SVGLineElement, WorkspaceGraphLink>(linkEl).datum();
          const srcId = typeof linkData.source === 'string' ? linkData.source : (linkData.source as WorkspaceGraphNode).id;
          const tgtId = typeof linkData.target === 'string' ? linkData.target : (linkData.target as WorkspaceGraphNode).id;
          const neighborId = srcId === nodeId ? tgtId : srcId;

          if (visibleNodeIds.has(neighborId) && !changedNodeIds.has(neighborId)) {
            const totalRels = nodeRelCounts.get(neighborId) ?? 0;
            if (totalRels === 0) continue;
            const el = cullingNodeElements.get(neighborId);
            if (!el) continue;
            const neighborLinks = nodeLinkMap.get(neighborId) ?? [];
            let visibleLinkCount = 0;
            for (const nl of neighborLinks) {
              if (nl.getAttribute('display') !== 'none') visibleLinkCount++;
            }
            d3.select(el)
              .select('.cull-badge')
              .attr('display', visibleLinkCount < totalRels ? '' : 'none');
          }
        }
      }

      // Swap: save current as previous for next frame
      prevVisibleNodeIds.clear();
      for (const id of visibleNodeIds) prevVisibleNodeIds.add(id);
    };

    // Rebuild quadtree after node positions change
    const rebuildQuadtree = () => {
      quadtree.removeAll(nodes);
      quadtree.addAll(nodes);
    };

    const scheduleViewportCulling = () => {
      if (cullingRafId !== null) return;
      cullingRafId = requestAnimationFrame(() => {
        cullingRafId = null;
        updateViewportCulling();
      });
    };

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
      // Save the calculated positions after initial layout
      debouncedSave();
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

    // Initial viewport culling pass
    updateViewportCulling();

    // Detect new nodes for smooth position transitions
    const currentNodeIds = new Set(nodes.map(n => n.id));
    const newNodeIds = nodes.filter(n => !prevNodeIdsRef.current.has(n.id)).map(n => n.id);
    const hasNewNodes = newNodeIds.length > 0 && prevNodeIdsRef.current.size > 0;

    if (hasNewNodes) {
      const usePlacementAlgorithm = newNodeIds.length >= PLACEMENT_CONFIG.forceLayoutThreshold;

      if (usePlacementAlgorithm) {
        // Large batch: use synchronous placement algorithm (no force simulation)
        const newNodesNeedingPositions = nodes.filter(n => newNodeIds.includes(n.id) && !workspace.viewState?.entityPositions[n.id]);

        if (newNodesNeedingPositions.length > 0) {
          const existingEntities = nodes
            .filter(n => prevNodeIdsRef.current.has(n.id) && n.x !== undefined && n.y !== undefined)
            .map(n => ({ id: n.id, x: n.x!, y: n.y! }));

          const { positions } = calculateEntityPositions({
            existingEntities,
            newEntities: newNodesNeedingPositions.map(n => ({ id: n.id, type: n.type })),
            relationships: workspace.relationshipList,
            nodeRadius: GRAPH_CONFIG.nodeRadius
          });

          for (const n of newNodesNeedingPositions) {
            const pos = positions[n.id];
            if (pos) {
              n.x = pos.x;
              n.y = pos.y;
            }
          }
        }

        // Update DOM
        node.filter(d => newNodeIds.includes(d.id)).attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
        link
          .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
          .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
          .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
          .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);

        debouncedSave();
        rebuildQuadtree();
        updateViewportCulling();
      } else {
        // Small batch: use D3 force layout animation
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        const findRelatedExistingNode = (newNodeId: string): WorkspaceGraphNode | undefined => {
          for (const l of links) {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            if (sourceId === newNodeId && prevNodeIdsRef.current.has(targetId)) return nodeMap.get(targetId);
            if (targetId === newNodeId && prevNodeIdsRef.current.has(sourceId)) return nodeMap.get(sourceId);
          }
          return undefined;
        };

        const fallbackNode = nodes.find(n => prevNodeIdsRef.current.has(n.id));
        const fallbackX = fallbackNode?.x ?? width / 2;
        const fallbackY = fallbackNode?.y ?? height / 2;

        for (const n of nodes) {
          if (newNodeIds.includes(n.id)) {
            const savedPos = workspace.viewState?.entityPositions[n.id];
            if (!savedPos) {
              const relatedNode = findRelatedExistingNode(n.id);
              n.x = relatedNode?.x ?? fallbackX;
              n.y = relatedNode?.y ?? fallbackY;
            }
          }
        }

        node.filter(d => newNodeIds.includes(d.id)).attr('transform', d => `translate(${d.x},${d.y})`);

        for (const n of nodes) {
          const savedPos = workspace.viewState?.entityPositions[n.id];
          if (prevNodeIdsRef.current.has(n.id) || savedPos) {
            n.fx = n.x;
            n.fy = n.y;
          }
        }

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
            link
              .attr('x1', d => (d.source as WorkspaceGraphNode).x ?? 0)
              .attr('y1', d => (d.source as WorkspaceGraphNode).y ?? 0)
              .attr('x2', d => (d.target as WorkspaceGraphNode).x ?? 0)
              .attr('y2', d => (d.target as WorkspaceGraphNode).y ?? 0);
            node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

            if (expandSim.alpha() < 0.002) {
              expandSim.stop();
              for (const n of nodes) {
                n.fx = null;
                n.fy = null;
              }
              debouncedSave();
            }
          })
          .on('end', () => {
            for (const n of nodes) {
              n.fx = null;
              n.fy = null;
            }
            debouncedSave();
            rebuildQuadtree();
            updateViewportCulling();
          });
      }
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

    // Reuse cullingNodeElements as nodeElementMap for group drag updates
    const nodeElementMap = cullingNodeElements;

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
    // Disabled during preview mode (regular nodes shouldn't move)
    // Use .filter() to exclude Shift+Click - those go to preview handler instead
    const drag = d3
      .drag<SVGGElement, WorkspaceGraphNode>()
      .filter(event => !event.shiftKey && !event.altKey) // Shift+Click or Alt+Click goes to preview, not drag
      .clickDistance(4) // Allow clicks/dblclicks through if pointer moves less than 4px
      .on('start', function (event, d) {
        console.log('[WorkspaceGraph] drag start', { shiftKey: event.sourceEvent?.shiftKey, entityId: d.id });
        // Disable regular node dragging during preview mode
        if (previewStateRef.current?.isActive) return;

        this.setAttribute('cursor', 'grabbing');
        // Note: We intentionally do NOT select the node here.
        // Selecting triggers a React state update which causes a re-render,
        // interrupting the D3 drag sequence. Selection is handled by the click handler,
        // and .clickDistance(4) ensures short drags are treated as clicks.
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, WorkspaceGraphNode, WorkspaceGraphNode>, d) {
        // Disable regular node dragging during preview mode
        if (previewStateRef.current?.isActive) return;

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
        rebuildQuadtree();
        updateViewportCulling();
      });

    node.call(drag);

    // Shift+Click (or Alt+Click) for preview - handle via mousedown to ensure we catch it before drag
    node.on('mousedown.preview', function (event: MouseEvent, d: WorkspaceGraphNode) {
      if ((event.shiftKey || event.altKey) && event.button === 0) {
        event.preventDefault();
        event.stopPropagation();
        justAltClickedRef.current = true;
        setTimeout(() => {
          justAltClickedRef.current = false;
        }, 100);
        if (onAltClickRef.current) {
          onAltClickRef.current(d.id, { x: d.x ?? 0, y: d.y ?? 0 });
        }
      }
    });

    // Left-click on node: single select, ctrl+click toggle
    node.on('click', function (event: MouseEvent, d: WorkspaceGraphNode) {
      event.stopPropagation();

      // Shift+Click / Alt+Click is handled in mousedown.preview, skip here
      if (event.shiftKey || event.altKey) {
        return;
      }

      // If preview is active, ignore other click interactions
      if (previewStateRef.current?.isActive) return;

      // Focus the editor group panel when clicking a node
      onFocusPanel?.();
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+click: toggle this node in/out of selection
        onToggleEntitySelection(d.id);
      } else {
        // Regular click: if node already selected, keep selection (allows multi-drag)
        // Otherwise, select only this node
        const isAlreadySelected = selectedEntityIdsRef.current.includes(d.id);
        if (!isAlreadySelected) {
          onSetSelectedEntityIds([d.id]);
        }
      }
    });

    // Add right-click handler for context menu (disabled during preview)
    node.on('contextmenu', function (event: MouseEvent, d: WorkspaceGraphNode) {
      event.preventDefault();
      if (previewStateRef.current?.isActive) return;
      onContextMenu(event, d.id);
    });

    // Double-click on node: open entity detail popup (disabled during preview)
    node.on('dblclick', function (event: MouseEvent, d: WorkspaceGraphNode) {
      event.preventDefault();
      event.stopPropagation();
      if (previewStateRef.current?.isActive) return;
      // Open popup at node's lower-right corner (use ref to avoid stale closure)
      handleOpenPopupRef.current(d.id, d.x ?? 0, d.y ?? 0);
    });

    // Rectangle selection: use native event listeners to avoid D3 zoom interference
    const svgElement = svgRef.current!;

    const handleMouseDown = (event: MouseEvent) => {
      // Disable rectangle selection during preview mode
      if (previewStateRef.current?.isActive) return;

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

    // Click on empty canvas: clear selection (only if not completing a drag or Shift+click)
    svg.on('click', function () {
      if (justCompletedDragRef.current || justAltClickedRef.current) return;
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
      if (cullingRafId !== null) cancelAnimationFrame(cullingRafId);
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
    const svg = d3.select(svgRef.current);
    svg
      .selectAll<SVGRectElement, WorkspaceGraphNode>('.nodes g rect')
      .attr('fill', d => (selectedEntityIds.includes(d.id) ? GRAPH_CONFIG.nodeColorSelected : GRAPH_CONFIG.nodeColor));
    // Update badge circle color to match selected state
    svg
      .selectAll<SVGCircleElement, WorkspaceGraphNode>('.nodes g .cull-badge circle')
      .attr('fill', d => (selectedEntityIds.includes(d.id) ? GRAPH_CONFIG.nodeColorSelected : GRAPH_CONFIG.nodeColor));
  }, [selectedEntityIds]);

  // Render preview nodes/groups when previewState changes
  useEffect(() => {
    // Stop any running preview simulation and cache current positions
    if (previewSimulationRef.current) {
      // Cache positions of nodes that were still animating
      // Only mark as initialized if they've moved close to the target distance
      // This prevents interrupted animations from freezing nodes near their source
      const cache = previewCacheRef.current;
      const targetDist = PREVIEW_CONFIG.previewDistance;
      for (const [id, item] of previewAnimatingRef.current) {
        const dx = item.x - item.sourcePos.x;
        const dy = item.y - item.sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const reachedTarget = dist > targetDist * 0.5;
        cache.set(id, {
          x: item.x,
          y: item.y,
          sourceX: item.sourcePos.x,
          sourceY: item.sourcePos.y,
          initialized: reachedTarget
        });
      }
      previewAnimatingRef.current.clear();
      previewSimulationRef.current.stop();
      previewSimulationRef.current = null;
    }

    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>('g');

    // If main graph group doesn't exist yet, skip (will re-run when it does)
    if (g.empty()) return;

    // Remove any existing preview elements
    g.selectAll('.preview-layer').remove();

    if (!previewState?.isActive) {
      // Clear cache when preview is deactivated
      previewCacheRef.current.clear();
      return;
    }

    const { sourceEntityIds, sourcePositions, nodes: previewNodes, groups: previewGroups } = previewState;
    const items = [...previewNodes, ...previewGroups];
    if (items.length === 0) return;

    const cache = previewCacheRef.current;

    // Build set of current item IDs
    const currentItemIds = new Set(items.map(item => ('id' in item ? item.id : `group-${item.sourceEntityId}-${item.entityType}`)));

    // Clean up stale cache entries (items no longer in preview)
    for (const cachedId of cache.keys()) {
      if (!currentItemIds.has(cachedId)) {
        cache.delete(cachedId);
      }
    }

    // Create preview layer group
    const previewLayer = g.append('g').attr('class', 'preview-layer');

    // Build force simulation data for preview nodes
    // Include existing graph nodes as fixed positions to avoid overlap
    interface SimNode {
      id: string;
      x: number;
      y: number;
      fx?: number;
      fy?: number;
      index?: number;
    }

    const existingNodePositions: SimNode[] = nodesRef.current.map((n: WorkspaceGraphNode) => ({
      id: n.id,
      x: n.x ?? 0,
      y: n.y ?? 0,
      fx: n.x ?? 0, // Fixed position
      fy: n.y ?? 0
    }));

    // Check which items need initialization (force layout + animation)
    // Items with initialized=true keep their cached position and don't animate
    const uninitializedItems: { item: (typeof items)[0]; index: number; sourcePos: { x: number; y: number } }[] = [];

    items.forEach((item, index) => {
      const id = 'id' in item ? item.id : `group-${item.sourceEntityId}-${item.entityType}`;
      const cached = cache.get(id);
      if (!cached || !cached.initialized) {
        const itemSourceId = item.sourceEntityId;
        const sourcePos = sourcePositions[itemSourceId] ?? sourcePositions[sourceEntityIds[0]] ?? { x: 0, y: 0 };
        uninitializedItems.push({ item, index, sourcePos });
      }
    });

    console.log('[Preview] items:', items.length, 'uninitialized:', uninitializedItems.length, 'cache:', cache.size);

    // Track DOM elements for uninitialized items so force tick can update them
    interface AnimatingItem {
      simNodeId: string;
      sourceId: string; // ID of source entity in allSimNodes for forceLink
      nodeEl: d3.Selection<SVGGElement, unknown, null, undefined>;
      lineEl: d3.Selection<SVGLineElement, unknown, null, undefined>;
      sourcePos: { x: number; y: number };
      pos: { x: number; y: number }; // Mutable ref updated by tick, read by click handlers
    }
    const animatingItems: AnimatingItem[] = [];

    // Helper to create individual preview node DOM (shared for both animated and static)
    const createPreviewNodeDOM = (
      entity: (typeof previewNodes)[0],
      parentGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
      position: { x: number; y: number },
      srcPos: { x: number; y: number },
      isAnimating: boolean
    ) => {
      const nodeGroup = parentGroup.append('g').attr('class', 'preview-node').attr('data-preview-id', entity.id);

      // Dashed connecting line to source
      const line = nodeGroup
        .append('line')
        .attr('x1', srcPos.x)
        .attr('y1', srcPos.y)
        .attr('x2', position.x)
        .attr('y2', position.y)
        .attr('stroke', PREVIEW_CONFIG.borderColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', PREVIEW_CONFIG.lineDash)
        .attr('opacity', PREVIEW_CONFIG.nodeOpacity);

      // Node group
      const node = nodeGroup
        .append('g')
        .attr('transform', `translate(${position.x}, ${position.y})`)
        .style('cursor', 'pointer')
        .style('opacity', isAnimating ? 0 : 1);

      // Fade in for new nodes
      if (isAnimating) {
        node.transition().duration(150).style('opacity', 1);
      }

      // Node square with dashed border
      node
        .append('rect')
        .attr('x', -GRAPH_CONFIG.nodeRadius)
        .attr('y', -GRAPH_CONFIG.nodeRadius)
        .attr('width', GRAPH_CONFIG.nodeRadius * 2)
        .attr('height', GRAPH_CONFIG.nodeRadius * 2)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', GRAPH_CONFIG.nodeColor)
        .attr('fill-opacity', PREVIEW_CONFIG.nodeOpacity)
        .attr('stroke', PREVIEW_CONFIG.borderColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', PREVIEW_CONFIG.lineDash);

      // Entity icon
      const iconSymbolId = entity.type in ENTITY_ICON_CONFIG ? entity.type : 'unknown';
      node
        .append('use')
        .attr('href', `#entity-icon-${iconSymbolId}`)
        .attr('x', -GRAPH_CONFIG.iconSize / 2)
        .attr('y', -GRAPH_CONFIG.iconSize / 2)
        .attr('width', GRAPH_CONFIG.iconSize)
        .attr('height', GRAPH_CONFIG.iconSize)
        .attr('fill', 'white')
        .attr('opacity', PREVIEW_CONFIG.nodeOpacity);

      // Label below node
      const label = entity.labelNormalized.length > 15 ? entity.labelNormalized.slice(0, 15) + '...' : entity.labelNormalized;
      node
        .append('text')
        .attr('y', GRAPH_CONFIG.nodeRadius + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('opacity', PREVIEW_CONFIG.nodeOpacity * 0.9)
        .text(label);

      // [+] button overlay (hidden by default, shown on hover)
      const addButton = node.append('g').attr('class', 'add-button').attr('opacity', 0).style('cursor', 'pointer');
      addButton
        .append('circle')
        .attr('cx', GRAPH_CONFIG.nodeRadius - 4)
        .attr('cy', -GRAPH_CONFIG.nodeRadius + 4)
        .attr('r', 10)
        .attr('fill', GRAPH_CONFIG.nodeColorSelected)
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5);
      addButton
        .append('text')
        .attr('x', GRAPH_CONFIG.nodeRadius - 4)
        .attr('y', -GRAPH_CONFIG.nodeRadius + 4)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('+');

      // Hover and click interactions - pos is mutable, updated by tick handler
      const pos = { ...position };
      node
        .on('mouseenter', function () {
          d3.select(this).select('rect').attr('stroke', GRAPH_CONFIG.nodeColorSelected).attr('stroke-dasharray', 'none');
          d3.select(this).select('.add-button').attr('opacity', 1);
        })
        .on('mouseleave', function () {
          d3.select(this).select('rect').attr('stroke', PREVIEW_CONFIG.borderColor).attr('stroke-dasharray', PREVIEW_CONFIG.lineDash);
          d3.select(this).select('.add-button').attr('opacity', 0);
        })
        .on('mousedown', function (event: MouseEvent) {
          // Shift+Click / Alt+Click: expand preview node's connections (don't add to graph)
          if ((event.shiftKey || event.altKey) && event.button === 0) {
            event.preventDefault();
            event.stopPropagation();
            justAltClickedRef.current = true;
            setTimeout(() => {
              justAltClickedRef.current = false;
            }, 100);
            // Expand its connections as more preview nodes
            if (onAltClickRef.current) {
              onAltClickRef.current(entity.id, pos);
            }
          }
        })
        .on('click', function (event: MouseEvent) {
          console.log('[PreviewNode] click', { shiftKey: event.shiftKey, altKey: event.altKey, entityId: entity.id });
          event.stopPropagation();
          // Skip if Shift/Alt was held (handled in mousedown)
          if (event.shiftKey || event.altKey) return;
          // Regular click adds entity to graph
          if (onPreviewAddEntityRef.current) {
            console.log('[PreviewNode] adding entity to graph', entity.id);
            onPreviewAddEntityRef.current(entity.id, pos);
          }
        });

      return { node, line, pos };
    };

    // Helper to create grouped preview node DOM
    const createPreviewGroupDOM = (
      group: (typeof previewGroups)[0],
      parentGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
      position: { x: number; y: number },
      srcPos: { x: number; y: number },
      isAnimating: boolean
    ) => {
      const groupEl = parentGroup.append('g').attr('class', 'preview-group').attr('data-preview-group', group.entityType);

      // Dashed connecting line to source
      const line = groupEl
        .append('line')
        .attr('x1', srcPos.x)
        .attr('y1', srcPos.y)
        .attr('x2', position.x)
        .attr('y2', position.y)
        .attr('stroke', PREVIEW_CONFIG.borderColor)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', PREVIEW_CONFIG.lineDash)
        .attr('opacity', PREVIEW_CONFIG.nodeOpacity);

      const node = groupEl
        .append('g')
        .attr('transform', `translate(${position.x}, ${position.y})`)
        .style('cursor', 'pointer')
        .style('opacity', isAnimating ? 0 : 1);

      if (isAnimating) {
        node.transition().duration(150).style('opacity', 1);
      }

      // Circle node
      node
        .append('circle')
        .attr('r', GRAPH_CONFIG.nodeRadius)
        .attr('fill', GRAPH_CONFIG.nodeColor)
        .attr('fill-opacity', PREVIEW_CONFIG.nodeOpacity)
        .attr('stroke', PREVIEW_CONFIG.borderColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', PREVIEW_CONFIG.lineDash);

      // Entity type icon
      const iconSymbolId = group.entityType in ENTITY_ICON_CONFIG ? group.entityType : 'unknown';
      node
        .append('use')
        .attr('href', `#entity-icon-${iconSymbolId}`)
        .attr('x', -GRAPH_CONFIG.iconSize / 2 + 2)
        .attr('y', -GRAPH_CONFIG.iconSize / 2 + 2)
        .attr('width', GRAPH_CONFIG.iconSize - 4)
        .attr('height', GRAPH_CONFIG.iconSize - 4)
        .attr('fill', 'white')
        .attr('opacity', PREVIEW_CONFIG.nodeOpacity);

      // Count badge
      const badge = node.append('g').attr('transform', `translate(${GRAPH_CONFIG.nodeRadius - 4}, ${-GRAPH_CONFIG.nodeRadius + 4})`);
      badge
        .append('rect')
        .attr('x', -12)
        .attr('y', -8)
        .attr('width', 24)
        .attr('height', 16)
        .attr('rx', 8)
        .attr('fill', GRAPH_CONFIG.nodeColorSelected);
      badge
        .append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', 'white')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(group.count > 999 ? '999+' : group.count);

      // Label
      node
        .append('text')
        .attr('y', GRAPH_CONFIG.nodeRadius + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('opacity', PREVIEW_CONFIG.nodeOpacity * 0.9)
        .text(group.entityType);

      // Hover and click
      node
        .on('mouseenter', function () {
          d3.select(this).select('circle').attr('stroke', GRAPH_CONFIG.nodeColorSelected).attr('stroke-dasharray', 'none');
        })
        .on('mouseleave', function () {
          d3.select(this).select('circle').attr('stroke', PREVIEW_CONFIG.borderColor).attr('stroke-dasharray', PREVIEW_CONFIG.lineDash);
        })
        .on('click', function (event: MouseEvent) {
          event.stopPropagation();
          if (onPreviewGroupClickRef.current) {
            onPreviewGroupClickRef.current(group.entityType, { x: event.clientX, y: event.clientY });
          }
        });

      return { node, line };
    };

    // Render all items - initialized at cached positions, uninitialized at source positions
    if (previewNodes.length > 0) {
      previewNodes.forEach(entity => {
        const id = entity.id;
        const cached = cache.get(id);
        const isInitialized = cached?.initialized;

        if (isInitialized && cached) {
          // Already settled - render at cached position
          const pos = { x: cached.x, y: cached.y };
          const srcPos = { x: cached.sourceX, y: cached.sourceY };
          createPreviewNodeDOM(entity, previewLayer, pos, srcPos, false);
        } else {
          // Uninitialized - render at source position, force simulation will move it
          const itemSourceId = entity.sourceEntityId;
          const srcPos = sourcePositions[itemSourceId] ?? sourcePositions[sourceEntityIds[0]] ?? { x: 0, y: 0 };
          const { node, line, pos } = createPreviewNodeDOM(entity, previewLayer, srcPos, srcPos, true);
          animatingItems.push({ simNodeId: id, sourceId: itemSourceId, nodeEl: node, lineEl: line, sourcePos: srcPos, pos });
        }
      });
    }

    if (previewGroups.length > 0) {
      previewGroups.forEach(group => {
        const groupId = `group-${group.sourceEntityId}-${group.entityType}`;
        const cached = cache.get(groupId);
        const isInitialized = cached?.initialized;

        if (isInitialized && cached) {
          const pos = { x: cached.x, y: cached.y };
          const srcPos = { x: cached.sourceX, y: cached.sourceY };
          createPreviewGroupDOM(group, previewLayer, pos, srcPos, false);
        } else {
          const itemSourceId = group.sourceEntityId;
          const srcPos = sourcePositions[itemSourceId] ?? sourcePositions[sourceEntityIds[0]] ?? { x: 0, y: 0 };
          const { node, line } = createPreviewGroupDOM(group, previewLayer, srcPos, srcPos, true);
          animatingItems.push({
            simNodeId: groupId,
            sourceId: itemSourceId,
            nodeEl: node,
            lineEl: line,
            sourcePos: srcPos,
            pos: { ...srcPos }
          });
        }
      });
    }

    // Run async force simulation for uninitialized items
    if (animatingItems.length > 0) {
      // Include already-positioned preview items as fixed nodes
      const fixedPreviewPositions: SimNode[] = [];
      items.forEach(item => {
        const id = 'id' in item ? item.id : `group-${item.sourceEntityId}-${item.entityType}`;
        const cached = cache.get(id);
        if (cached?.initialized) {
          fixedPreviewPositions.push({ id, x: cached.x, y: cached.y, fx: cached.x, fy: cached.y });
        }
      });

      // Add source positions as fixed nodes
      const existingIds = new Set(existingNodePositions.map(n => n.id));
      const fixedSourcePositions: SimNode[] = [];
      for (const sourceId of sourceEntityIds) {
        if (!existingIds.has(sourceId)) {
          const pos = sourcePositions[sourceId];
          if (pos) {
            fixedSourcePositions.push({ id: sourceId, x: pos.x, y: pos.y, fx: pos.x, fy: pos.y });
          }
        }
      }

      // Create simulation nodes for uninitialized items
      interface PreviewSimNode extends SimNode {
        sourceX: number;
        sourceY: number;
        sourceId: string;
      }
      // Scale preview distance gently with sqrt so nodes stay near source
      // Collision force will push overflow into concentric rings naturally
      const scaledPreviewDistance = PREVIEW_CONFIG.previewDistance * Math.max(1, Math.sqrt(animatingItems.length / 8));
      const initialOffset = scaledPreviewDistance * 0.3;
      const previewSimNodes: PreviewSimNode[] = animatingItems.map(({ simNodeId, sourceId, sourcePos }, i) => {
        const angle = (i / animatingItems.length) * Math.PI * 2;
        return {
          id: simNodeId,
          index: i,
          x: sourcePos.x + Math.cos(angle) * initialOffset,
          y: sourcePos.y + Math.sin(angle) * initialOffset,
          sourceX: sourcePos.x,
          sourceY: sourcePos.y,
          sourceId
        };
      });

      // Build lookup from simNode id to animating item
      const simNodeMap = new Map<string, { simNode: PreviewSimNode; animItem: AnimatingItem }>();
      previewSimNodes.forEach((simNode, i) => {
        simNodeMap.set(simNode.id, { simNode, animItem: animatingItems[i] });
      });

      interface SimNodeWithSource extends SimNode {
        sourceX?: number;
        sourceY?: number;
        sourceId?: string;
      }
      const allSimNodes: SimNodeWithSource[] = [
        ...existingNodePositions,
        ...fixedSourcePositions,
        ...fixedPreviewPositions,
        ...previewSimNodes
      ];
      const previewDistance = scaledPreviewDistance;

      // Create links from each preview node to its source for d3.forceLink
      const simLinks = previewSimNodes.map(simNode => ({
        source: simNode.sourceId,
        target: simNode.id
      }));

      // Populate animating ref so cleanup can cache positions if interrupted
      previewAnimatingRef.current = new Map(
        previewSimNodes.map((simNode, i) => [simNode.id, { x: simNode.x, y: simNode.y, sourcePos: animatingItems[i].sourcePos }])
      );

      // Track previous positions to detect stability
      const prevPositions = new Map<string, { x: number; y: number }>();
      const STABILITY_THRESHOLD = 0.5; // px - stop if no node moved more than this
      let stableTicks = 0;
      const STABLE_TICKS_REQUIRED = 3; // consecutive stable ticks before stopping

      // Incrementally grow link distance so nodes spread out naturally
      const MIN_LINK_DISTANCE = previewDistance * 0.4;
      const MAX_LINK_DISTANCE = previewDistance;
      let currentLinkDistance = MIN_LINK_DISTANCE;
      const LINK_DISTANCE_STEP = (MAX_LINK_DISTANCE - MIN_LINK_DISTANCE) / 60; // grow over ~60 ticks
      const MAX_SIM_MS = 3000; // hard cap at 3 seconds

      const cacheAndStop = (sim: d3.Simulation<SimNodeWithSource, undefined>) => {
        sim.stop();
        for (const [id, { simNode, animItem }] of simNodeMap) {
          cache.set(id, {
            x: simNode.x,
            y: simNode.y,
            sourceX: animItem.sourcePos.x,
            sourceY: animItem.sourcePos.y,
            initialized: true
          });
        }
        previewAnimatingRef.current.clear();
      };

      // Use d3.forceLink for proper link-distance-based positioning
      const linkForce = d3
        .forceLink<SimNodeWithSource, (typeof simLinks)[0]>(simLinks)
        .id(d => d.id)
        .distance(currentLinkDistance)
        .strength(1);

      const simulation = d3
        .forceSimulation(allSimNodes)
        .alphaDecay(0.05)
        .force('link', linkForce)
        .force(
          'collision',
          d3
            .forceCollide<SimNodeWithSource>()
            .radius(GRAPH_CONFIG.nodeRadius * 2.5)
            .strength(0.8)
            .iterations(2)
        )
        .force(
          'charge',
          d3.forceManyBody<SimNodeWithSource>().strength(node => (node.fx !== undefined ? 0 : -200))
        )
        .on('tick', () => {
          // Grow link distance incrementally and update the force
          if (currentLinkDistance < MAX_LINK_DISTANCE) {
            currentLinkDistance = Math.min(currentLinkDistance + LINK_DISTANCE_STEP, MAX_LINK_DISTANCE);
            linkForce.distance(currentLinkDistance);
          }

          // Check if all movable nodes have stabilized
          let maxMovement = 0;
          for (const [id, { simNode }] of simNodeMap) {
            const prev = prevPositions.get(id);
            if (prev) {
              const dx = simNode.x - prev.x;
              const dy = simNode.y - prev.y;
              maxMovement = Math.max(maxMovement, Math.abs(dx), Math.abs(dy));
            }
            prevPositions.set(id, { x: simNode.x, y: simNode.y });
          }

          // Update DOM positions
          for (const [id, { simNode, animItem }] of simNodeMap) {
            animItem.nodeEl.attr('transform', `translate(${simNode.x}, ${simNode.y})`);
            animItem.lineEl.attr('x2', simNode.x).attr('y2', simNode.y);
            animItem.pos.x = simNode.x;
            animItem.pos.y = simNode.y;
            const entry = previewAnimatingRef.current.get(id);
            if (entry) {
              entry.x = simNode.x;
              entry.y = simNode.y;
            }
          }

          // Check if links are close to target distance
          let maxDistanceError = 0;
          for (const [, { simNode }] of simNodeMap) {
            if (simNode.sourceX !== undefined && simNode.sourceY !== undefined) {
              const ldx = simNode.x - simNode.sourceX;
              const ldy = simNode.y - simNode.sourceY;
              const linkDist = Math.sqrt(ldx * ldx + ldy * ldy);
              maxDistanceError = Math.max(maxDistanceError, Math.abs(linkDist - currentLinkDistance));
            }
          }

          // Stop early if nodes stopped moving AND links are near target distance AND distance fully grown
          if (maxMovement < STABILITY_THRESHOLD && maxDistanceError < GRAPH_CONFIG.nodeRadius && currentLinkDistance >= MAX_LINK_DISTANCE) {
            stableTicks++;
            if (stableTicks >= STABLE_TICKS_REQUIRED) {
              cacheAndStop(simulation);
            }
          } else {
            stableTicks = 0;
          }
        })
        .on('end', () => {
          // Cache final positions when simulation settles naturally
          for (const [id, { simNode, animItem }] of simNodeMap) {
            cache.set(id, {
              x: simNode.x,
              y: simNode.y,
              sourceX: animItem.sourcePos.x,
              sourceY: animItem.sourcePos.y,
              initialized: true
            });
          }
          previewAnimatingRef.current.clear();
        });

      // Hard 3-second timeout
      const timeoutId = setTimeout(() => {
        if (previewSimulationRef.current === simulation) {
          cacheAndStop(simulation);
        }
      }, MAX_SIM_MS);

      // Store simulation and cleanup timeout together
      previewSimulationRef.current = simulation;
      const origStop = simulation.stop.bind(simulation);
      simulation.stop = () => {
        clearTimeout(timeoutId);
        return origStop();
      };
    }

    // Cleanup preview layer when effect re-runs
    return () => {
      if (previewSimulationRef.current) {
        // Cache positions of nodes still animating
        // Only mark as initialized if they've moved close to target distance
        const cleanupCache = previewCacheRef.current;
        const cleanupTargetDist = PREVIEW_CONFIG.previewDistance;
        for (const [id, item] of previewAnimatingRef.current) {
          const dx = item.x - item.sourcePos.x;
          const dy = item.y - item.sourcePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const reachedTarget = dist > cleanupTargetDist * 0.5;
          cleanupCache.set(id, {
            x: item.x,
            y: item.y,
            sourceX: item.sourcePos.x,
            sourceY: item.sourcePos.y,
            initialized: reachedTarget
          });
        }
        previewAnimatingRef.current.clear();
        previewSimulationRef.current.stop();
        previewSimulationRef.current = null;
      }
      g.selectAll('.preview-layer').remove();
    };
  }, [previewState, dimensions]); // Include dimensions so preview re-renders after resize

  // -----------------------------------------------------------------------
  // Minimap: Canvas rendering + click-to-pan
  // -----------------------------------------------------------------------

  // Render minimap whenever nodes move or viewport changes
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !dimensions) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const mw = MINIMAP_CONFIG.width;
    const mh = MINIMAP_CONFIG.height;
    const pad = MINIMAP_CONFIG.padding;

    // Clear canvas
    ctx.clearRect(0, 0, mw, mh);
    ctx.fillStyle = MINIMAP_CONFIG.background;
    ctx.fillRect(0, 0, mw, mh);

    if (nodes.length === 0) return;

    // Compute node bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      const nx = n.x ?? 0;
      const ny = n.y ?? 0;
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny;
      if (ny > maxY) maxY = ny;
    }

    // Add padding to bounds
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const boundsW = maxX - minX || 1;
    const boundsH = maxY - minY || 1;

    // Scale to fit minimap
    const scale = Math.min(mw / boundsW, mh / boundsH);
    const offsetX = (mw - boundsW * scale) / 2;
    const offsetY = (mh - boundsH * scale) / 2;

    // Draw nodes as dots
    ctx.fillStyle = GRAPH_CONFIG.nodeColor;
    const r = MINIMAP_CONFIG.dotRadius;
    for (const n of nodes) {
      const x = ((n.x ?? 0) - minX) * scale + offsetX;
      const y = ((n.y ?? 0) - minY) * scale + offsetY;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw viewport rectangle
    const t = transformRef.current;
    // Viewport corners in world coords
    const vpMinX = -t.x / t.k;
    const vpMinY = -t.y / t.k;
    const vpMaxX = (dimensions.width - t.x) / t.k;
    const vpMaxY = (dimensions.height - t.y) / t.k;

    // Convert to minimap coords
    const rx = (vpMinX - minX) * scale + offsetX;
    const ry = (vpMinY - minY) * scale + offsetY;
    const rw = (vpMaxX - vpMinX) * scale;
    const rh = (vpMaxY - vpMinY) * scale;

    ctx.fillStyle = MINIMAP_CONFIG.viewportFill;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = MINIMAP_CONFIG.viewportStroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);

    // Store bounds on canvas dataset for click-to-pan calculations
    canvas.dataset.boundsMinX = String(minX);
    canvas.dataset.boundsMinY = String(minY);
    canvas.dataset.boundsScale = String(scale);
    canvas.dataset.boundsOffsetX = String(offsetX);
    canvas.dataset.boundsOffsetY = String(offsetY);
  }, [dimensions, renderTrigger]);

  // Click/drag on minimap to pan the main graph
  const handleMinimapInteraction = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = minimapCanvasRef.current;
      if (!canvas || !svgRef.current || !zoomRef.current || !dimensions) return;

      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      // Read stored bounds from canvas dataset
      const boundsMinX = Number(canvas.dataset.boundsMinX ?? 0);
      const boundsMinY = Number(canvas.dataset.boundsMinY ?? 0);
      const scale = Number(canvas.dataset.boundsScale ?? 1);
      const offsetX = Number(canvas.dataset.boundsOffsetX ?? 0);
      const offsetY = Number(canvas.dataset.boundsOffsetY ?? 0);

      // Convert minimap pixel to world coordinate
      const worldX = (mx - offsetX) / scale + boundsMinX;
      const worldY = (my - offsetY) / scale + boundsMinY;

      // Pan so this world point is at the center of the viewport
      const t = transformRef.current;
      const newX = dimensions.width / 2 - worldX * t.k;
      const newY = dimensions.height / 2 - worldY * t.k;

      const newTransform = d3.zoomIdentity.translate(newX, newY).scale(t.k);
      d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.transform, newTransform);
    },
    [dimensions]
  );

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

      // Focus this panel first (prevents selection from being cleared by focus effect)
      onFocusPanel?.();

      onAddEntity(entity.id, position);
    },
    [entityMap, onAddEntity, onFocusPanel]
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

      {/* Minimap - upper right */}
      <canvas
        ref={minimapCanvasRef}
        width={MINIMAP_CONFIG.width}
        height={MINIMAP_CONFIG.height}
        className="absolute top-4 right-4 cursor-crosshair rounded"
        style={{ border: `1px solid ${MINIMAP_CONFIG.borderColor}` }}
        onClick={handleMinimapInteraction}
        onMouseDown={e => {
          if (e.button !== 0) return;
          handleMinimapInteraction(e);
          const onMouseMove = (moveEvent: MouseEvent) => {
            handleMinimapInteraction(moveEvent as unknown as React.MouseEvent<HTMLCanvasElement>);
          };
          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
      />

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
