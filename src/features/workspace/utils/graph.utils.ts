/**
 * Workspace Graph Utilities
 *
 * Pure, stateless functions extracted from workspace-graph.component.tsx.
 * No React, no DOM access, no D3 selections — only math and data transforms.
 */

import { GRAPH_CONFIG, CULLING_CONFIG, MINIMAP_CONFIG, PREVIEW_CONFIG } from '../const';

// ─── Types ────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MinimapTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  bounds: Bounds;
}

export interface FitTransform {
  translateX: number;
  translateY: number;
  scale: number;
}

// ─── Geometry & Coordinates ───────────────────────────────────────────

/** Check if a point is inside a rectangle. */
export function isPointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** Euclidean distance between two deltas. */
export function computeDistance(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp a value to [min, max]. */
export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Compute axis-aligned bounding rect from two corner points.
 * Handles drag in any direction (start may be > end).
 */
export function computeSelectionRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  };
}

/**
 * Invert a zoom/pan transform to convert screen-relative SVG coordinates
 * to world (graph) coordinates.
 *
 * The caller is responsible for subtracting the SVG element's bounding rect
 * from raw screen coordinates before passing them here.
 */
export function invertTransform(svgX: number, svgY: number, transform: Transform): Point {
  return {
    x: (svgX - transform.x) / transform.k,
    y: (svgY - transform.y) / transform.k
  };
}

/**
 * Apply a zoom/pan transform to convert world (graph) coordinates
 * to container-relative screen coordinates.
 */
export function applyTransform(worldX: number, worldY: number, transform: Transform): Point {
  return {
    x: worldX * transform.k + transform.x,
    y: worldY * transform.k + transform.y
  };
}

/**
 * Compute the bounding box of an array of positioned nodes.
 * Returns null if nodes is empty.
 */
export function computeNodeBounds(nodes: Point[]): Bounds | null {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Calculate zoom-to-fit transform for given nodes within a viewport.
 * Returns translation and scale values (caller wraps with d3.zoomIdentity).
 */
export function calculateFitTransform(
  nodes: Point[],
  width: number,
  height: number,
  options?: { padding?: number; nodeRadius?: number }
): FitTransform {
  const padding = options?.padding ?? GRAPH_CONFIG.fitPadding;
  const nodeRadius = options?.nodeRadius ?? GRAPH_CONFIG.nodeRadius;

  const bounds = computeNodeBounds(nodes);
  if (!bounds) return { translateX: 0, translateY: 0, scale: 1 };

  const graphWidth = bounds.maxX - bounds.minX + nodeRadius * 2;
  const graphHeight = bounds.maxY - bounds.minY + nodeRadius * 2;
  const graphCenterX = (bounds.minX + bounds.maxX) / 2;
  const graphCenterY = (bounds.minY + bounds.maxY) / 2;

  const scale = Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight, 1);
  const translateX = width / 2 - graphCenterX * scale;
  const translateY = height / 2 - graphCenterY * scale;

  return { translateX, translateY, scale };
}

// ─── Data Transforms ──────────────────────────────────────────────

/** Extract source and target IDs from a D3 link (handles string | object). */
export function getLinkNodeIds(link: { source: string | { id: string }; target: string | { id: string } }): {
  sourceId: string;
  targetId: string;
} {
  return {
    sourceId: typeof link.source === 'string' ? link.source : link.source.id,
    targetId: typeof link.target === 'string' ? link.target : link.target.id
  };
}

/**
 * Build a map from node ID → array of link indices for fast lookup.
 * Used during drag to update only connected links.
 */
export function buildNodeLinkMap(
  nodeIds: string[],
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const id of nodeIds) {
    map.set(id, []);
  }
  links.forEach((link, index) => {
    const { sourceId, targetId } = getLinkNodeIds(link);
    map.get(sourceId)?.push(index);
    map.get(targetId)?.push(index);
  });
  return map;
}

/**
 * Compute relationship counts per node from link array.
 */
export function computeRelationshipCounts(
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of links) {
    const { sourceId, targetId } = getLinkNodeIds(link);
    counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }
  return counts;
}

/** Format a relationship count for badge display. */
export function formatBadgeCount(count: number): string {
  return count > 1000 ? '1k+' : String(count);
}

// ─── Viewport Culling ─────────────────────────────────────────────

/**
 * Compute world-space viewport bounds from transform and dimensions.
 * Adds configurable padding to prevent pop-in.
 */
export function computeViewportBounds(transform: Transform, width: number, height: number, padding?: number): Bounds {
  const pad = padding ?? CULLING_CONFIG.viewportPadding;
  return {
    minX: -transform.x / transform.k - pad,
    minY: -transform.y / transform.k - pad,
    maxX: (width - transform.x) / transform.k + pad,
    maxY: (height - transform.y) / transform.k + pad
  };
}

/**
 * Compute the diff between two sets: which items were added and removed.
 */
export function diffSets<T>(current: Set<T>, previous: Set<T>): { added: Set<T>; removed: Set<T> } {
  const added = new Set<T>();
  const removed = new Set<T>();

  for (const id of current) {
    if (!previous.has(id)) added.add(id);
  }
  for (const id of previous) {
    if (!current.has(id)) removed.add(id);
  }

  return { added, removed };
}

/** Determine if a link should be visible based on whether both endpoints are visible. */
export function isLinkVisible(sourceId: string, targetId: string, visibleNodeIds: Set<string>): boolean {
  return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
}

/** Determine if a culling badge should be shown (some links are hidden). */
export function shouldShowBadge(visibleLinkCount: number, totalRelCount: number): boolean {
  return totalRelCount > 0 && visibleLinkCount < totalRelCount;
}

// ─── Minimap ──────────────────────────────────────────────────────

/**
 * Compute minimap transform: scale and offset to fit node bounds into minimap dimensions.
 * Returns null if there are no nodes.
 */
export function computeMinimapTransform(
  nodes: Point[],
  minimapWidth?: number,
  minimapHeight?: number,
  padding?: number
): MinimapTransform | null {
  const mw = minimapWidth ?? MINIMAP_CONFIG.width;
  const mh = minimapHeight ?? MINIMAP_CONFIG.height;
  const pad = padding ?? MINIMAP_CONFIG.padding;

  const rawBounds = computeNodeBounds(nodes);
  if (!rawBounds) return null;

  const bounds: Bounds = {
    minX: rawBounds.minX - pad,
    minY: rawBounds.minY - pad,
    maxX: rawBounds.maxX + pad,
    maxY: rawBounds.maxY + pad
  };

  const boundsW = bounds.maxX - bounds.minX || 1;
  const boundsH = bounds.maxY - bounds.minY || 1;

  const scale = Math.min(mw / boundsW, mh / boundsH);
  const offsetX = (mw - boundsW * scale) / 2;
  const offsetY = (mh - boundsH * scale) / 2;

  return { scale, offsetX, offsetY, bounds };
}

/** Convert world coordinate to minimap pixel coordinate. */
export function worldToMinimap(worldX: number, worldY: number, mt: MinimapTransform): Point {
  return {
    x: (worldX - mt.bounds.minX) * mt.scale + mt.offsetX,
    y: (worldY - mt.bounds.minY) * mt.scale + mt.offsetY
  };
}

/** Convert minimap pixel coordinate to world coordinate. */
export function minimapToWorld(minimapX: number, minimapY: number, mt: MinimapTransform): Point {
  return {
    x: (minimapX - mt.offsetX) / mt.scale + mt.bounds.minX,
    y: (minimapY - mt.offsetY) / mt.scale + mt.bounds.minY
  };
}

/**
 * Compute the viewport rectangle in minimap coordinates.
 */
export function viewportToMinimap(transform: Transform, viewWidth: number, viewHeight: number, mt: MinimapTransform): Rect {
  const vpMinX = -transform.x / transform.k;
  const vpMinY = -transform.y / transform.k;
  const vpMaxX = (viewWidth - transform.x) / transform.k;
  const vpMaxY = (viewHeight - transform.y) / transform.k;

  const topLeft = worldToMinimap(vpMinX, vpMinY, mt);
  const bottomRight = worldToMinimap(vpMaxX, vpMaxY, mt);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y
  };
}

// ─── Preview Helpers ──────────────────────────────────────────────

/** Generate consistent ID for a preview item (node or group). */
export function computePreviewItemId(item: { id?: string; sourceEntityId: string; entityType?: string }): string {
  return item.id ?? `group-${item.sourceEntityId}-${item.entityType}`;
}

/**
 * Scale preview distance based on number of items.
 * Uses sqrt so nodes stay near source; collision force handles overflow.
 */
export function computeScaledPreviewDistance(itemCount: number, baseDistance?: number): number {
  const dist = baseDistance ?? PREVIEW_CONFIG.previewDistance;
  return dist * Math.max(1, Math.sqrt(itemCount / 8));
}

/**
 * Compute initial positions for preview items distributed in a circle around source.
 * Returns array of { x, y } positions.
 */
export function computeInitialPreviewPositions(count: number, sourcePos: Point, scaledDistance: number): Point[] {
  const initialOffset = scaledDistance * PREVIEW_CONFIG.initialOffsetRatio;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      x: sourcePos.x + Math.cos(angle) * initialOffset,
      y: sourcePos.y + Math.sin(angle) * initialOffset
    };
  });
}

/**
 * Check if an animated preview item has moved far enough from its source
 * to be considered "initialized" (reached target distance).
 */
export function hasReachedTarget(position: Point, sourcePosition: Point, targetDistance: number, threshold?: number): boolean {
  const dx = position.x - sourcePosition.x;
  const dy = position.y - sourcePosition.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist > targetDistance * (threshold ?? 0.5);
}
