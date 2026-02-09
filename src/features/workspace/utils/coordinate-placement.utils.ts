/**
 * Smart Coordinate Placement Algorithm
 *
 * Computes x,y positions for new entities without force simulation.
 * Uses occupancy grid for O(1) collision checks and golden-angle spiral
 * for finding nearest free positions.
 *
 * Algorithm:
 * 1. Build occupancy grid from existing entity positions
 * 2. Place connected entities at centroid of their connections
 * 3. Place isolated entities in type-clustered spirals from graph center
 * 4. Fallback to grid placement if time limit exceeded
 */

import { PLACEMENT_CONFIG } from '../const';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlacementInput {
  /** Existing entities that already have x,y positions */
  existingEntities: Array<{ id: string; x: number; y: number }>;
  /** New entities that need positions */
  newEntities: Array<{ id: string; type: string }>;
  /** All relationships (existing + new) */
  relationships: Array<{ sourceEntityId: string; relatedEntityId: string }>;
  /** Node radius from GRAPH_CONFIG */
  nodeRadius: number;
}

export interface PlacementResult {
  /** Map of entity ID → computed position */
  positions: Record<string, { x: number; y: number }>;
  /** Placement statistics */
  stats: {
    totalPlaced: number;
    connectedPlaced: number;
    isolatedPlaced: number;
    fallbackPlaced: number;
    durationMs: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOLDEN_ANGLE = 2.399963229728653; // radians

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function worldToGrid(x: number, y: number, cellSize: number): { gx: number; gy: number } {
  return {
    gx: Math.round(x / cellSize),
    gy: Math.round(y / cellSize)
  };
}

function gridToWorld(gx: number, gy: number, cellSize: number): { x: number; y: number } {
  return {
    x: gx * cellSize,
    y: gy * cellSize
  };
}

function cellKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

function buildOccupancyGrid(entities: Array<{ x: number; y: number }>, cellSize: number, padding: number): Set<string> {
  const grid = new Set<string>();

  for (const entity of entities) {
    const { gx, gy } = worldToGrid(entity.x, entity.y, cellSize);
    for (let dx = -padding; dx <= padding; dx++) {
      for (let dy = -padding; dy <= padding; dy++) {
        grid.add(cellKey(gx + dx, gy + dy));
      }
    }
  }

  return grid;
}

function computeCentroid(positions: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (positions.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  for (const pos of positions) {
    sumX += pos.x;
    sumY += pos.y;
  }

  return {
    x: sumX / positions.length,
    y: sumY / positions.length
  };
}

/**
 * Spiral outward from a starting grid cell using golden angle.
 * Returns the first unoccupied cell, or null if maxIterations exceeded.
 */
function findNearestFreeCell(
  grid: Set<string>,
  startGX: number,
  startGY: number,
  maxIterations: number
): { gx: number; gy: number } | null {
  // Try the starting cell first
  if (!grid.has(cellKey(startGX, startGY))) {
    return { gx: startGX, gy: startGY };
  }

  // Spiral outward
  for (let i = 1; i < maxIterations; i++) {
    const angle = i * GOLDEN_ANGLE;
    const radius = Math.sqrt(i) * 1.1;
    const gx = startGX + Math.round(radius * Math.cos(angle));
    const gy = startGY + Math.round(radius * Math.sin(angle));

    if (!grid.has(cellKey(gx, gy))) {
      return { gx, gy };
    }
  }

  return null;
}

/**
 * Build adjacency map: for each entity ID, which other entity IDs is it connected to?
 */
function buildAdjacencyMap(
  entityIds: Set<string>,
  relationships: Array<{ sourceEntityId: string; relatedEntityId: string }>
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const rel of relationships) {
    const { sourceEntityId, relatedEntityId } = rel;

    if (entityIds.has(sourceEntityId)) {
      const existing = adjacency.get(sourceEntityId);
      if (existing) {
        existing.push(relatedEntityId);
      } else {
        adjacency.set(sourceEntityId, [relatedEntityId]);
      }
    }

    if (entityIds.has(relatedEntityId)) {
      const existing = adjacency.get(relatedEntityId);
      if (existing) {
        existing.push(sourceEntityId);
      } else {
        adjacency.set(relatedEntityId, [sourceEntityId]);
      }
    }
  }

  return adjacency;
}

/**
 * Place remaining entities in a simple grid as a fallback.
 */
function placeFallbackGrid(
  entities: Array<{ id: string; type: string }>,
  grid: Set<string>,
  cellSize: number,
  startGX: number,
  startGY: number
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let col = 0;
  let row = 0;
  const cols = Math.ceil(Math.sqrt(entities.length));

  for (const entity of entities) {
    let gx = startGX + col;
    let gy = startGY + row;

    // Skip occupied cells
    while (grid.has(cellKey(gx, gy))) {
      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
      gx = startGX + col;
      gy = startGY + row;
    }

    const world = gridToWorld(gx, gy, cellSize);
    positions[entity.id] = world;
    grid.add(cellKey(gx, gy));

    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Main Algorithm
// ---------------------------------------------------------------------------

export function calculateEntityPositions(input: PlacementInput): PlacementResult {
  const { existingEntities, newEntities, relationships, nodeRadius } = input;
  const startTime = performance.now();

  const cellSize = nodeRadius * PLACEMENT_CONFIG.cellSizeMultiplier;
  const positions: Record<string, { x: number; y: number }> = {};
  const stats = {
    totalPlaced: 0,
    connectedPlaced: 0,
    isolatedPlaced: 0,
    fallbackPlaced: 0,
    durationMs: 0
  };

  if (newEntities.length === 0) {
    stats.durationMs = performance.now() - startTime;
    return { positions, stats };
  }

  // Step 1: Build occupancy grid from existing entities
  const grid = buildOccupancyGrid(existingEntities, cellSize, PLACEMENT_CONFIG.clusterPadding);

  // Step 2: Build a pool of positioned entities (starts with existing, grows as we place)
  const positionedPool = new Map<string, { x: number; y: number }>();
  for (const entity of existingEntities) {
    positionedPool.set(entity.id, { x: entity.x, y: entity.y });
  }

  // Step 3: Build adjacency map for new entities
  const newEntityIds = new Set(newEntities.map(e => e.id));
  const adjacency = buildAdjacencyMap(newEntityIds, relationships);

  // Step 4: Separate connected vs isolated, sort connected by connection count desc
  const connected: Array<{ id: string; type: string }> = [];
  const isolated: Array<{ id: string; type: string }> = [];

  for (const entity of newEntities) {
    const neighbors = adjacency.get(entity.id);
    if (neighbors && neighbors.length > 0) {
      connected.push(entity);
    } else {
      isolated.push(entity);
    }
  }

  // Sort connected by connection count (most connected first)
  connected.sort((a, b) => {
    const aCount = adjacency.get(a.id)?.length ?? 0;
    const bCount = adjacency.get(b.id)?.length ?? 0;
    return bCount - aCount;
  });

  // Step 5: Place connected entities
  let timedOut = false;

  for (let i = 0; i < connected.length; i++) {
    // Check timeout
    if (i > 0 && i % PLACEMENT_CONFIG.timeoutCheckInterval === 0) {
      if (performance.now() - startTime > PLACEMENT_CONFIG.maxTimeMs) {
        timedOut = true;
        // Fallback for remaining connected entities
        const remaining = connected.slice(i);
        const centroid = computeCentroid([...positionedPool.values()]);
        const fallbackStart = worldToGrid(centroid.x, centroid.y, cellSize);
        const fallbackPositions = placeFallbackGrid(remaining, grid, cellSize, fallbackStart.gx + 20, fallbackStart.gy + 20);
        for (const [id, pos] of Object.entries(fallbackPositions)) {
          positions[id] = pos;
          positionedPool.set(id, pos);
          stats.fallbackPlaced++;
          stats.totalPlaced++;
        }
        break;
      }
    }

    const entity = connected[i];
    const neighbors = adjacency.get(entity.id) ?? [];

    // Find positioned neighbors (existing or already-placed new entities)
    const positionedNeighbors: Array<{ x: number; y: number }> = [];
    for (const neighborId of neighbors) {
      const pos = positionedPool.get(neighborId);
      if (pos) {
        positionedNeighbors.push(pos);
      }
    }

    let targetGX: number;
    let targetGY: number;

    if (positionedNeighbors.length === 0) {
      // No positioned neighbors yet — treat as isolated (will be handled later
      // or placed near centroid)
      isolated.push(entity);
      continue;
    } else {
      // Compute centroid of positioned neighbors
      const centroid = computeCentroid(positionedNeighbors);
      const gridPos = worldToGrid(centroid.x, centroid.y, cellSize);
      targetGX = gridPos.gx;
      targetGY = gridPos.gy;
    }

    // Find nearest free cell from target
    // Use larger search radius proportional to how many entities are already placed
    const searchRadius = Math.max(PLACEMENT_CONFIG.maxSpiralIterations, positionedPool.size);
    const freeCell = findNearestFreeCell(grid, targetGX, targetGY, searchRadius);

    if (freeCell) {
      const world = gridToWorld(freeCell.gx, freeCell.gy, cellSize);
      positions[entity.id] = world;
      positionedPool.set(entity.id, world);
      grid.add(cellKey(freeCell.gx, freeCell.gy));
      stats.connectedPlaced++;
      stats.totalPlaced++;
    } else {
      // Spiral exhausted — place via fallback grid
      const fallbackPositions = placeFallbackGrid([entity], grid, cellSize, targetGX + Math.ceil(Math.sqrt(positionedPool.size)), targetGY);
      for (const [id, pos] of Object.entries(fallbackPositions)) {
        positions[id] = pos;
        positionedPool.set(id, pos);
        stats.fallbackPlaced++;
        stats.totalPlaced++;
      }
    }
  }

  // Step 6: Place isolated entities (grouped by type, center-spiral)
  if (!timedOut && isolated.length > 0) {
    // Group by type
    const byType = new Map<string, Array<{ id: string; type: string }>>();
    for (const entity of isolated) {
      const group = byType.get(entity.type);
      if (group) {
        group.push(entity);
      } else {
        byType.set(entity.type, [entity]);
      }
    }

    // Sort: smallest groups first (fit in tighter gaps)
    const sortedGroups = [...byType.entries()].sort((a, b) => a[1].length - b[1].length);

    // Compute centroid of all positioned entities
    const allPositioned = [...positionedPool.values()];
    const graphCentroid = allPositioned.length > 0 ? computeCentroid(allPositioned) : { x: 0, y: 0 };

    for (const [, entities] of sortedGroups) {
      // Check timeout
      if (performance.now() - startTime > PLACEMENT_CONFIG.maxTimeMs) {
        timedOut = true;
        const centroidGrid = worldToGrid(graphCentroid.x, graphCentroid.y, cellSize);
        const fallbackPositions = placeFallbackGrid(entities, grid, cellSize, centroidGrid.gx + 30, centroidGrid.gy + 30);
        for (const [id, pos] of Object.entries(fallbackPositions)) {
          positions[id] = pos;
          positionedPool.set(id, pos);
          stats.fallbackPlaced++;
          stats.totalPlaced++;
        }
        continue;
      }

      // Find a starting point for this type cluster: spiral from graph centroid
      // Use a large search radius since the grid may be dense after placing connected entities
      const centroidGrid = worldToGrid(graphCentroid.x, graphCentroid.y, cellSize);
      const maxSearchIterations = Math.max(PLACEMENT_CONFIG.maxSpiralIterations * 2, positionedPool.size * 2);
      const clusterStart = findNearestFreeCell(grid, centroidGrid.gx, centroidGrid.gy, maxSearchIterations);

      if (!clusterStart) {
        // Grid is extremely dense — fallback to grid placement far from center
        const fallbackPositions = placeFallbackGrid(
          entities,
          grid,
          cellSize,
          centroidGrid.gx + Math.ceil(Math.sqrt(positionedPool.size)),
          centroidGrid.gy
        );
        for (const [id, pos] of Object.entries(fallbackPositions)) {
          positions[id] = pos;
          positionedPool.set(id, pos);
          stats.fallbackPlaced++;
          stats.totalPlaced++;
        }
        continue;
      }

      // Pack entities in a spiral from the cluster start
      // Allow enough iterations for the entire group
      const maxSpiralForGroup = Math.max(PLACEMENT_CONFIG.maxSpiralIterations * 3, entities.length * 3);
      let spiralIndex = 0;
      for (const entity of entities) {
        // Check timeout periodically
        if (stats.totalPlaced > 0 && stats.totalPlaced % PLACEMENT_CONFIG.timeoutCheckInterval === 0) {
          if (performance.now() - startTime > PLACEMENT_CONFIG.maxTimeMs) {
            timedOut = true;
            break;
          }
        }

        // Find next free cell spiraling from cluster start
        let placed = false;
        while (spiralIndex < maxSpiralForGroup) {
          let gx: number;
          let gy: number;

          if (spiralIndex === 0) {
            gx = clusterStart.gx;
            gy = clusterStart.gy;
          } else {
            const angle = spiralIndex * GOLDEN_ANGLE;
            const radius = Math.sqrt(spiralIndex) * 1.2;
            gx = clusterStart.gx + Math.round(radius * Math.cos(angle));
            gy = clusterStart.gy + Math.round(radius * Math.sin(angle));
          }

          spiralIndex++;

          if (!grid.has(cellKey(gx, gy))) {
            const world = gridToWorld(gx, gy, cellSize);
            positions[entity.id] = world;
            positionedPool.set(entity.id, world);
            grid.add(cellKey(gx, gy));
            stats.isolatedPlaced++;
            stats.totalPlaced++;
            placed = true;
            break;
          }
        }

        if (!placed) {
          // Spiral exhausted, use fallback
          const fallbackPositions = placeFallbackGrid(
            [entity],
            grid,
            cellSize,
            clusterStart.gx + Math.ceil(Math.sqrt(positionedPool.size)),
            clusterStart.gy
          );
          for (const [id, pos] of Object.entries(fallbackPositions)) {
            positions[id] = pos;
            positionedPool.set(id, pos);
            stats.fallbackPlaced++;
            stats.totalPlaced++;
          }
        }
      }

      if (timedOut) {
        // Place remaining groups via fallback
        break;
      }
    }

    // Handle remaining isolated entities if timed out mid-group
    if (timedOut) {
      const unplaced = isolated.filter(e => !positions[e.id]);
      if (unplaced.length > 0) {
        const centroidGrid = worldToGrid(graphCentroid.x, graphCentroid.y, cellSize);
        const fallbackPositions = placeFallbackGrid(unplaced, grid, cellSize, centroidGrid.gx + 40, centroidGrid.gy + 40);
        for (const [id, pos] of Object.entries(fallbackPositions)) {
          positions[id] = pos;
          positionedPool.set(id, pos);
          stats.fallbackPlaced++;
          stats.totalPlaced++;
        }
      }
    }
  }

  stats.durationMs = performance.now() - startTime;
  return { positions, stats };
}
