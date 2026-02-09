import { calculateEntityPositions, type PlacementInput } from './coordinate-placement.utils';
import { GRAPH_CONFIG, PLACEMENT_CONFIG } from '../const';
import googleOrgData from '@/lib/mock-data/googleOrgData.json';

const NODE_RADIUS = GRAPH_CONFIG.nodeRadius;
const CELL_SIZE = NODE_RADIUS * PLACEMENT_CONFIG.cellSizeMultiplier;

/**
 * Check that no two positions occupy the same grid cell.
 * This is O(n) using a Set, matching how the algorithm prevents collisions.
 */
function hasGridCollisions(
  positions: Array<{ x: number; y: number }>,
  cellSize: number
): { hasCollision: boolean; collisionCount: number } {
  const occupied = new Set<string>();
  let collisionCount = 0;

  for (const pos of positions) {
    const gx = Math.round(pos.x / cellSize);
    const gy = Math.round(pos.y / cellSize);
    const key = `${gx},${gy}`;

    if (occupied.has(key)) {
      collisionCount++;
    } else {
      occupied.add(key);
    }
  }

  return { hasCollision: collisionCount > 0, collisionCount };
}

/**
 * Compute Euclidean distance between two points.
 */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

describe('calculateEntityPositions', () => {
  // -----------------------------------------------------------------------
  // Basic Placement
  // -----------------------------------------------------------------------

  describe('basic placement', () => {
    test('returns empty positions for empty input', () => {
      const result = calculateEntityPositions({
        existingEntities: [],
        newEntities: [],
        relationships: [],
        nodeRadius: NODE_RADIUS
      });

      expect(result.positions).toEqual({});
      expect(result.stats.totalPlaced).toBe(0);
    });

    test('places a single isolated entity near origin', () => {
      const result = calculateEntityPositions({
        existingEntities: [{ id: 'existing-1', x: 0, y: 0 }],
        newEntities: [{ id: 'new-1', type: 'Person' }],
        relationships: [],
        nodeRadius: NODE_RADIUS
      });

      expect(result.positions['new-1']).toBeDefined();
      expect(result.stats.totalPlaced).toBe(1);
      expect(result.stats.isolatedPlaced).toBe(1);
    });

    test('places entity with 1 connection near its target', () => {
      const existing = { id: 'existing-1', x: 500, y: 500 };

      const result = calculateEntityPositions({
        existingEntities: [existing],
        newEntities: [{ id: 'new-1', type: 'Person' }],
        relationships: [{ sourceEntityId: 'new-1', relatedEntityId: 'existing-1' }],
        nodeRadius: NODE_RADIUS
      });

      const newPos = result.positions['new-1'];
      expect(newPos).toBeDefined();
      expect(result.stats.connectedPlaced).toBe(1);

      // Should be within reasonable distance of the existing entity
      const dist = distance(newPos, existing);
      expect(dist).toBeLessThan(CELL_SIZE * 10);
    });

    test('places entity at centroid of 2 connections', () => {
      const existingA = { id: 'a', x: 0, y: 0 };
      const existingB = { id: 'b', x: 500, y: 0 };

      const result = calculateEntityPositions({
        existingEntities: [existingA, existingB],
        newEntities: [{ id: 'new-1', type: 'Person' }],
        relationships: [
          { sourceEntityId: 'new-1', relatedEntityId: 'a' },
          { sourceEntityId: 'new-1', relatedEntityId: 'b' }
        ],
        nodeRadius: NODE_RADIUS
      });

      const newPos = result.positions['new-1'];
      expect(newPos).toBeDefined();

      // Should be closer to midpoint (250, 0) than to either end
      const midpoint = { x: 250, y: 0 };
      const distToMidpoint = distance(newPos, midpoint);
      const distToA = distance(newPos, existingA);
      const distToB = distance(newPos, existingB);
      expect(distToMidpoint).toBeLessThan(distToA);
      expect(distToMidpoint).toBeLessThan(distToB);
    });

    test('places entity at centroid of 3+ connections', () => {
      const existingA = { id: 'a', x: 0, y: 0 };
      const existingB = { id: 'b', x: 600, y: 0 };
      const existingC = { id: 'c', x: 300, y: 600 };

      const result = calculateEntityPositions({
        existingEntities: [existingA, existingB, existingC],
        newEntities: [{ id: 'new-1', type: 'Person' }],
        relationships: [
          { sourceEntityId: 'new-1', relatedEntityId: 'a' },
          { sourceEntityId: 'new-1', relatedEntityId: 'b' },
          { sourceEntityId: 'new-1', relatedEntityId: 'c' }
        ],
        nodeRadius: NODE_RADIUS
      });

      const newPos = result.positions['new-1'];
      expect(newPos).toBeDefined();

      // Centroid of the 3 points is (300, 200)
      const centroid = { x: 300, y: 200 };
      const distToCentroid = distance(newPos, centroid);
      // Should be near the centroid (within a few cells)
      expect(distToCentroid).toBeLessThan(CELL_SIZE * 5);
    });
  });

  // -----------------------------------------------------------------------
  // Collision Detection
  // -----------------------------------------------------------------------

  describe('collision detection', () => {
    test('no collisions when placing 100 entities', () => {
      const existingEntities = Array.from({ length: 10 }, (_, i) => ({
        id: `existing-${i}`,
        x: i * 200,
        y: i * 150
      }));

      const newEntities = Array.from({ length: 100 }, (_, i) => ({
        id: `new-${i}`,
        type: i % 2 === 0 ? 'Person' : 'Organization'
      }));

      const relationships = newEntities.slice(0, 50).map((e, i) => ({
        sourceEntityId: e.id,
        relatedEntityId: existingEntities[i % existingEntities.length].id
      }));

      const result = calculateEntityPositions({
        existingEntities,
        newEntities,
        relationships,
        nodeRadius: NODE_RADIUS
      });

      expect(result.stats.totalPlaced).toBe(100);

      // Combine all positions (existing + new)
      const allPositions = [...existingEntities.map(e => ({ x: e.x, y: e.y })), ...Object.values(result.positions)];

      const { hasCollision, collisionCount } = hasGridCollisions(allPositions, CELL_SIZE);
      expect(hasCollision).toBe(false);
      expect(collisionCount).toBe(0);
    });

    test('no collisions with densely packed existing entities', () => {
      // Create a dense grid of existing entities
      const existingEntities: Array<{ id: string; x: number; y: number }> = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          existingEntities.push({
            id: `existing-${row}-${col}`,
            x: col * CELL_SIZE,
            y: row * CELL_SIZE
          });
        }
      }

      const newEntities = Array.from({ length: 50 }, (_, i) => ({
        id: `new-${i}`,
        type: 'Person'
      }));

      const result = calculateEntityPositions({
        existingEntities,
        newEntities,
        relationships: [],
        nodeRadius: NODE_RADIUS
      });

      expect(result.stats.totalPlaced).toBe(50);

      const allPositions = [...existingEntities.map(e => ({ x: e.x, y: e.y })), ...Object.values(result.positions)];

      const { hasCollision } = hasGridCollisions(allPositions, CELL_SIZE);
      expect(hasCollision).toBe(false);
    });

    test('new entities do not collide with existing entities', () => {
      const existingEntities = [
        { id: 'e1', x: 0, y: 0 },
        { id: 'e2', x: CELL_SIZE, y: 0 },
        { id: 'e3', x: 0, y: CELL_SIZE },
        { id: 'e4', x: CELL_SIZE, y: CELL_SIZE }
      ];

      const newEntities = Array.from({ length: 20 }, (_, i) => ({
        id: `new-${i}`,
        type: 'Person'
      }));

      const result = calculateEntityPositions({
        existingEntities,
        newEntities,
        relationships: [],
        nodeRadius: NODE_RADIUS
      });

      // Verify no new entity shares a grid cell with any existing entity
      const existingCells = new Set(
        existingEntities.map(e => {
          const gx = Math.round(e.x / CELL_SIZE);
          const gy = Math.round(e.y / CELL_SIZE);
          return `${gx},${gy}`;
        })
      );

      for (const pos of Object.values(result.positions)) {
        const gx = Math.round(pos.x / CELL_SIZE);
        const gy = Math.round(pos.y / CELL_SIZE);
        expect(existingCells.has(`${gx},${gy}`)).toBe(false);
      }
    });
  });

  // -----------------------------------------------------------------------
  // New-to-New References
  // -----------------------------------------------------------------------

  describe('new-to-new connections', () => {
    test('newly placed entities are used as targets for later entities', () => {
      const existing = { id: 'e1', x: 0, y: 0 };

      // new-A connects to existing, new-B connects to new-A
      const result = calculateEntityPositions({
        existingEntities: [existing],
        newEntities: [
          { id: 'new-A', type: 'Person' },
          { id: 'new-B', type: 'Person' }
        ],
        relationships: [
          { sourceEntityId: 'new-A', relatedEntityId: 'e1' },
          { sourceEntityId: 'new-B', relatedEntityId: 'new-A' }
        ],
        nodeRadius: NODE_RADIUS
      });

      expect(result.positions['new-A']).toBeDefined();
      expect(result.positions['new-B']).toBeDefined();

      // new-B should be near new-A (since it connects to it)
      const dist = distance(result.positions['new-A'], result.positions['new-B']);
      expect(dist).toBeLessThan(CELL_SIZE * 10);
    });
  });

  // -----------------------------------------------------------------------
  // Large-Scale: Google Organization (~2000 entities)
  // -----------------------------------------------------------------------

  describe('Google organization (large-scale)', () => {
    let result: ReturnType<typeof calculateEntityPositions>;
    let input: PlacementInput;

    beforeAll(() => {
      const entities = googleOrgData.entities as Array<{ id: string; type: string }>;
      const relationships = googleOrgData.relationships as Array<{
        sourceEntityId: string;
        relatedEntityId: string;
      }>;

      // Simulate existing workspace with 10 positioned entities
      const existingEntities = entities.slice(0, 10).map((e, i) => ({
        id: e.id,
        x: (i % 5) * 200,
        y: Math.floor(i / 5) * 200
      }));

      const newEntities = entities.slice(10).map(e => ({
        id: e.id,
        type: e.type
      }));

      input = {
        existingEntities,
        newEntities,
        relationships,
        nodeRadius: NODE_RADIUS
      };

      result = calculateEntityPositions(input);
    });

    test('all entities receive positions', () => {
      expect(result.stats.totalPlaced).toBe(input.newEntities.length);

      for (const entity of input.newEntities) {
        expect(result.positions[entity.id]).toBeDefined();
        expect(typeof result.positions[entity.id].x).toBe('number');
        expect(typeof result.positions[entity.id].y).toBe('number');
      }
    });

    test('no grid collisions between any entities', () => {
      const allPositions = [...input.existingEntities.map(e => ({ x: e.x, y: e.y })), ...Object.values(result.positions)];

      const { hasCollision, collisionCount } = hasGridCollisions(allPositions, CELL_SIZE);
      expect(collisionCount).toBe(0);
      expect(hasCollision).toBe(false);
    });

    test('completes within time limit', () => {
      // Allow generous buffer over the 500ms config limit
      expect(result.stats.durationMs).toBeLessThan(2000);
    });

    test('connected entities are placed near their connections', () => {
      // Check a sample: executives connect to google-hq
      // Find executives that were in newEntities
      const execIds = input.newEntities
        .filter(e => e.id.startsWith('exec-'))
        .map(e => e.id)
        .slice(0, 5);

      const googleHQPos = input.existingEntities.find(e => e.id === 'google-hq');

      if (googleHQPos && execIds.length > 0) {
        for (const execId of execIds) {
          const execPos = result.positions[execId];
          if (execPos) {
            const dist = distance(execPos, googleHQPos);
            // Should be within reasonable distance (not placed at random far location)
            // 50 cells * cellSize is generous but ensures they're in the same region
            expect(dist).toBeLessThan(CELL_SIZE * 50);
          }
        }
      }
    });

    test('logs placement statistics', () => {
      expect(result.stats.connectedPlaced).toBeGreaterThan(0);
      expect(result.stats.totalPlaced).toBe(result.stats.connectedPlaced + result.stats.isolatedPlaced + result.stats.fallbackPlaced);

      // Log stats for manual review
      console.log('Google org placement stats:', result.stats);
    });
  });

  // -----------------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    test('handles all isolated entities (no relationships)', () => {
      const existingEntities = [{ id: 'e1', x: 0, y: 0 }];
      const newEntities = Array.from({ length: 100 }, (_, i) => ({
        id: `iso-${i}`,
        type: i < 50 ? 'Person' : 'Organization'
      }));

      const result = calculateEntityPositions({
        existingEntities,
        newEntities,
        relationships: [],
        nodeRadius: NODE_RADIUS
      });

      expect(result.stats.totalPlaced).toBe(100);
      expect(result.stats.connectedPlaced).toBe(0);
      expect(result.stats.isolatedPlaced).toBe(100);

      const allPositions = [{ x: 0, y: 0 }, ...Object.values(result.positions)];
      const { hasCollision } = hasGridCollisions(allPositions, CELL_SIZE);
      expect(hasCollision).toBe(false);
    });

    test('handles all entities connected to same target', () => {
      const existing = { id: 'hub', x: 500, y: 500 };
      const newEntities = Array.from({ length: 50 }, (_, i) => ({
        id: `spoke-${i}`,
        type: 'Person'
      }));

      const relationships = newEntities.map(e => ({
        sourceEntityId: e.id,
        relatedEntityId: 'hub'
      }));

      const result = calculateEntityPositions({
        existingEntities: [existing],
        newEntities,
        relationships,
        nodeRadius: NODE_RADIUS
      });

      expect(result.stats.totalPlaced).toBe(50);
      expect(result.stats.connectedPlaced).toBe(50);

      // All should be near the hub
      for (const pos of Object.values(result.positions)) {
        const dist = distance(pos, existing);
        expect(dist).toBeLessThan(CELL_SIZE * 30);
      }

      // No collisions
      const allPositions = [{ x: existing.x, y: existing.y }, ...Object.values(result.positions)];
      const { hasCollision } = hasGridCollisions(allPositions, CELL_SIZE);
      expect(hasCollision).toBe(false);
    });

    test('handles no existing entities', () => {
      const result = calculateEntityPositions({
        existingEntities: [],
        newEntities: [
          { id: 'a', type: 'Person' },
          { id: 'b', type: 'Person' }
        ],
        relationships: [{ sourceEntityId: 'a', relatedEntityId: 'b' }],
        nodeRadius: NODE_RADIUS
      });

      // Both entities should still get positions
      // 'a' connects to 'b' but 'b' has no position yet, so 'a' becomes isolated
      // then 'b' might reference 'a' if it was placed
      expect(result.stats.totalPlaced).toBe(2);

      const { hasCollision } = hasGridCollisions(Object.values(result.positions), CELL_SIZE);
      expect(hasCollision).toBe(false);
    });
  });
});
