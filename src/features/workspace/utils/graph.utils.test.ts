import {
  isPointInRect,
  invertTransform,
  applyTransform,
  computeNodeBounds,
  calculateFitTransform,
  getLinkNodeIds,
  buildNodeLinkMap,
  computeRelationshipCounts,
  formatBadgeCount,
  computeViewportBounds,
  diffSets,
  isLinkVisible,
  shouldShowBadge,
  computeMinimapTransform,
  worldToMinimap,
  minimapToWorld,
  viewportToMinimap,
  computePreviewItemId,
  computeScaledPreviewDistance,
  computeInitialPreviewPositions,
  hasReachedTarget,
  computeDistance,
  clampValue,
  computeSelectionRect
} from './graph.utils';

describe('graph.utils', () => {
  // ─── isPointInRect ────────────────────────────────────────────────

  describe('isPointInRect', () => {
    const rect = { x: 10, y: 10, width: 100, height: 50 };

    it('returns true for point inside rect', () => {
      expect(isPointInRect(50, 30, rect)).toBe(true);
    });

    it('returns true for point on edge (inclusive)', () => {
      expect(isPointInRect(10, 10, rect)).toBe(true);
      expect(isPointInRect(110, 60, rect)).toBe(true);
    });

    it('returns false for point outside rect', () => {
      expect(isPointInRect(5, 30, rect)).toBe(false);
      expect(isPointInRect(50, 5, rect)).toBe(false);
      expect(isPointInRect(111, 30, rect)).toBe(false);
      expect(isPointInRect(50, 61, rect)).toBe(false);
    });
  });

  // ─── invertTransform ──────────────────────────────────────────────

  describe('invertTransform', () => {
    it('returns identity for identity transform', () => {
      expect(invertTransform(100, 200, { x: 0, y: 0, k: 1 })).toEqual({ x: 100, y: 200 });
    });

    it('inverts translation', () => {
      expect(invertTransform(150, 250, { x: 50, y: 50, k: 1 })).toEqual({ x: 100, y: 200 });
    });

    it('inverts scale', () => {
      expect(invertTransform(200, 400, { x: 0, y: 0, k: 2 })).toEqual({ x: 100, y: 200 });
    });

    it('inverts combined translate + scale', () => {
      expect(invertTransform(250, 450, { x: 50, y: 50, k: 2 })).toEqual({ x: 100, y: 200 });
    });
  });

  // ─── applyTransform ──────────────────────────────────────────────

  describe('applyTransform', () => {
    it('returns identity for identity transform', () => {
      expect(applyTransform(100, 200, { x: 0, y: 0, k: 1 })).toEqual({ x: 100, y: 200 });
    });

    it('applies translation', () => {
      expect(applyTransform(100, 200, { x: 50, y: 50, k: 1 })).toEqual({ x: 150, y: 250 });
    });

    it('is inverse of invertTransform', () => {
      const transform = { x: 30, y: -20, k: 1.5 };
      const world = { x: 100, y: 200 };
      const screen = applyTransform(world.x, world.y, transform);
      const back = invertTransform(screen.x, screen.y, transform);
      expect(back.x).toBeCloseTo(world.x);
      expect(back.y).toBeCloseTo(world.y);
    });
  });

  // ─── computeNodeBounds ────────────────────────────────────────────

  describe('computeNodeBounds', () => {
    it('returns null for empty array', () => {
      expect(computeNodeBounds([])).toBeNull();
    });

    it('returns correct bounds for single node', () => {
      expect(computeNodeBounds([{ x: 50, y: 100 }])).toEqual({ minX: 50, minY: 100, maxX: 50, maxY: 100 });
    });

    it('returns correct bounds for multiple nodes', () => {
      const nodes = [
        { x: 10, y: 20 },
        { x: 50, y: 80 },
        { x: 30, y: 5 }
      ];
      expect(computeNodeBounds(nodes)).toEqual({ minX: 10, minY: 5, maxX: 50, maxY: 80 });
    });

    it('handles negative coordinates', () => {
      const nodes = [
        { x: -100, y: -50 },
        { x: 100, y: 50 }
      ];
      expect(computeNodeBounds(nodes)).toEqual({ minX: -100, minY: -50, maxX: 100, maxY: 50 });
    });
  });

  // ─── calculateFitTransform ────────────────────────────────────────

  describe('calculateFitTransform', () => {
    it('returns default for empty nodes', () => {
      expect(calculateFitTransform([], 800, 600)).toEqual({ translateX: 0, translateY: 0, scale: 1 });
    });

    it('centers a single node', () => {
      const result = calculateFitTransform([{ x: 100, y: 100 }], 800, 600, { padding: 50, nodeRadius: 20 });
      expect(result.scale).toBe(1);
      expect(result.translateX).toBeCloseTo(800 / 2 - 100);
      expect(result.translateY).toBeCloseTo(600 / 2 - 100);
    });

    it('scales down large graph to fit viewport', () => {
      const nodes = [
        { x: 0, y: 0 },
        { x: 2000, y: 2000 }
      ];
      const result = calculateFitTransform(nodes, 800, 600, { padding: 0, nodeRadius: 0 });
      expect(result.scale).toBeLessThan(1);
      expect(result.scale).toBeCloseTo(600 / 2000);
    });

    it('does not scale up small graph beyond 1', () => {
      const nodes = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ];
      const result = calculateFitTransform(nodes, 800, 600, { padding: 0, nodeRadius: 0 });
      expect(result.scale).toBe(1);
    });
  });

  // ─── getLinkNodeIds ─────────────────────────────────────────────

  describe('getLinkNodeIds', () => {
    it('extracts IDs from string sources', () => {
      expect(getLinkNodeIds({ source: 'a', target: 'b' })).toEqual({ sourceId: 'a', targetId: 'b' });
    });

    it('extracts IDs from object sources', () => {
      expect(getLinkNodeIds({ source: { id: 'a' }, target: { id: 'b' } })).toEqual({ sourceId: 'a', targetId: 'b' });
    });

    it('handles mixed string/object', () => {
      expect(getLinkNodeIds({ source: 'a', target: { id: 'b' } })).toEqual({ sourceId: 'a', targetId: 'b' });
    });
  });

  // ─── buildNodeLinkMap ─────────────────────────────────────────

  describe('buildNodeLinkMap', () => {
    it('returns empty arrays for nodes with no links', () => {
      const map = buildNodeLinkMap(['a', 'b'], []);
      expect(map.get('a')).toEqual([]);
      expect(map.get('b')).toEqual([]);
    });

    it('maps link indices to connected nodes', () => {
      const links = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' }
      ];
      const map = buildNodeLinkMap(['a', 'b', 'c'], links);
      expect(map.get('a')).toEqual([0]);
      expect(map.get('b')).toEqual([0, 1]);
      expect(map.get('c')).toEqual([1]);
    });
  });

  // ─── computeRelationshipCounts ────────────────────────────────

  describe('computeRelationshipCounts', () => {
    it('returns empty map for no links', () => {
      expect(computeRelationshipCounts([])).toEqual(new Map());
    });

    it('counts bidirectionally', () => {
      const links = [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' }
      ];
      const counts = computeRelationshipCounts(links);
      expect(counts.get('a')).toBe(2);
      expect(counts.get('b')).toBe(1);
      expect(counts.get('c')).toBe(1);
    });
  });

  // ─── formatBadgeCount ─────────────────────────────────────────

  describe('formatBadgeCount', () => {
    it('returns string for count <= 1000', () => {
      expect(formatBadgeCount(0)).toBe('0');
      expect(formatBadgeCount(42)).toBe('42');
      expect(formatBadgeCount(1000)).toBe('1000');
    });

    it('returns "1k+" for count > 1000', () => {
      expect(formatBadgeCount(1001)).toBe('1k+');
      expect(formatBadgeCount(5000)).toBe('1k+');
    });
  });

  // ─── computeViewportBounds ────────────────────────────────────

  describe('computeViewportBounds', () => {
    it('computes bounds at identity transform', () => {
      const bounds = computeViewportBounds({ x: 0, y: 0, k: 1 }, 800, 600, 0);
      expect(bounds.minX).toBeCloseTo(0);
      expect(bounds.minY).toBeCloseTo(0);
      expect(bounds.maxX).toBeCloseTo(800);
      expect(bounds.maxY).toBeCloseTo(600);
    });

    it('accounts for translation', () => {
      const bounds = computeViewportBounds({ x: 100, y: 50, k: 1 }, 800, 600, 0);
      expect(bounds).toEqual({ minX: -100, minY: -50, maxX: 700, maxY: 550 });
    });

    it('accounts for scale', () => {
      const bounds = computeViewportBounds({ x: 0, y: 0, k: 2 }, 800, 600, 0);
      expect(bounds.minX).toBeCloseTo(0);
      expect(bounds.minY).toBeCloseTo(0);
      expect(bounds.maxX).toBeCloseTo(400);
      expect(bounds.maxY).toBeCloseTo(300);
    });

    it('adds padding', () => {
      const bounds = computeViewportBounds({ x: 0, y: 0, k: 1 }, 800, 600, 100);
      expect(bounds).toEqual({ minX: -100, minY: -100, maxX: 900, maxY: 700 });
    });
  });

  // ─── diffSets ────────────────────────────────────────────────

  describe('diffSets', () => {
    it('returns empty sets when identical', () => {
      const { added, removed } = diffSets(new Set(['a', 'b']), new Set(['a', 'b']));
      expect(added.size).toBe(0);
      expect(removed.size).toBe(0);
    });

    it('detects added items', () => {
      const { added, removed } = diffSets(new Set(['a', 'b', 'c']), new Set(['a']));
      expect(added).toEqual(new Set(['b', 'c']));
      expect(removed.size).toBe(0);
    });

    it('detects removed items', () => {
      const { added, removed } = diffSets(new Set(['a']), new Set(['a', 'b', 'c']));
      expect(added.size).toBe(0);
      expect(removed).toEqual(new Set(['b', 'c']));
    });

    it('detects both added and removed', () => {
      const { added, removed } = diffSets(new Set(['a', 'c']), new Set(['a', 'b']));
      expect(added).toEqual(new Set(['c']));
      expect(removed).toEqual(new Set(['b']));
    });
  });

  // ─── isLinkVisible ───────────────────────────────────────────

  describe('isLinkVisible', () => {
    const visible = new Set(['a', 'b']);

    it('returns true when both endpoints visible', () => {
      expect(isLinkVisible('a', 'b', visible)).toBe(true);
    });

    it('returns false when source hidden', () => {
      expect(isLinkVisible('c', 'b', visible)).toBe(false);
    });

    it('returns false when target hidden', () => {
      expect(isLinkVisible('a', 'c', visible)).toBe(false);
    });
  });

  // ─── shouldShowBadge ─────────────────────────────────────────

  describe('shouldShowBadge', () => {
    it('returns false when no relationships', () => {
      expect(shouldShowBadge(0, 0)).toBe(false);
    });

    it('returns false when all links visible', () => {
      expect(shouldShowBadge(5, 5)).toBe(false);
    });

    it('returns true when some links hidden', () => {
      expect(shouldShowBadge(3, 5)).toBe(true);
    });
  });

  // ─── Minimap ──────────────────────────────────────────────────

  describe('computeMinimapTransform', () => {
    it('returns null for empty nodes', () => {
      expect(computeMinimapTransform([])).toBeNull();
    });

    it('computes transform for nodes', () => {
      const nodes = [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ];
      const mt = computeMinimapTransform(nodes, 200, 100, 0);
      expect(mt).not.toBeNull();
      expect(mt!.scale).toBeCloseTo(1);
    });
  });

  describe('worldToMinimap / minimapToWorld roundtrip', () => {
    it('roundtrips correctly', () => {
      const nodes = [
        { x: -500, y: -300 },
        { x: 500, y: 300 }
      ];
      const mt = computeMinimapTransform(nodes, 180, 120, 50)!;

      const world = { x: 100, y: -50 };
      const minimap = worldToMinimap(world.x, world.y, mt);
      const back = minimapToWorld(minimap.x, minimap.y, mt);

      expect(back.x).toBeCloseTo(world.x);
      expect(back.y).toBeCloseTo(world.y);
    });
  });

  describe('viewportToMinimap', () => {
    it('returns positive-sized rect', () => {
      const nodes = [
        { x: 0, y: 0 },
        { x: 800, y: 600 }
      ];
      const mt = computeMinimapTransform(nodes, 180, 120, 0)!;
      const rect = viewportToMinimap({ x: 0, y: 0, k: 1 }, 800, 600, mt);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    });
  });

  // ─── Preview Helpers ──────────────────────────────────────────

  describe('computePreviewItemId', () => {
    it('returns id for node items', () => {
      expect(computePreviewItemId({ id: 'entity-1', sourceEntityId: 'src-1' })).toBe('entity-1');
    });

    it('returns group ID for group items', () => {
      expect(computePreviewItemId({ sourceEntityId: 'src-1', entityType: 'Person' })).toBe('group-src-1-Person');
    });
  });

  describe('computeScaledPreviewDistance', () => {
    it('returns base distance for small counts', () => {
      expect(computeScaledPreviewDistance(1, 120)).toBe(120);
      expect(computeScaledPreviewDistance(8, 120)).toBe(120);
    });

    it('scales up for larger counts', () => {
      expect(computeScaledPreviewDistance(32, 120)).toBeCloseTo(120 * 2);
    });
  });

  describe('computeInitialPreviewPositions', () => {
    it('returns empty array for count 0', () => {
      expect(computeInitialPreviewPositions(0, { x: 0, y: 0 }, 100)).toEqual([]);
    });

    it('distributes items in a circle', () => {
      const positions = computeInitialPreviewPositions(4, { x: 100, y: 100 }, 100);
      expect(positions).toHaveLength(4);
      expect(positions[0].x).toBeGreaterThan(100);
      expect(positions[0].y).toBeCloseTo(100);
    });

    it('all positions are equidistant from source', () => {
      const source = { x: 50, y: 50 };
      const positions = computeInitialPreviewPositions(6, source, 120);
      const distances = positions.map(p => Math.sqrt((p.x - source.x) ** 2 + (p.y - source.y) ** 2));
      const firstDist = distances[0];
      for (const d of distances) {
        expect(d).toBeCloseTo(firstDist);
      }
    });
  });

  describe('hasReachedTarget', () => {
    it('returns false when at source', () => {
      expect(hasReachedTarget({ x: 0, y: 0 }, { x: 0, y: 0 }, 100)).toBe(false);
    });

    it('returns false when below threshold', () => {
      expect(hasReachedTarget({ x: 30, y: 0 }, { x: 0, y: 0 }, 100, 0.5)).toBe(false);
    });

    it('returns true when past threshold', () => {
      expect(hasReachedTarget({ x: 60, y: 0 }, { x: 0, y: 0 }, 100, 0.5)).toBe(true);
    });
  });

  // ─── computeDistance ──────────────────────────────────────────────

  describe('computeDistance', () => {
    it('returns 0 for zero deltas', () => {
      expect(computeDistance(0, 0)).toBe(0);
    });

    it('returns correct distance for 3-4-5 triangle', () => {
      expect(computeDistance(3, 4)).toBe(5);
    });

    it('handles negative deltas', () => {
      expect(computeDistance(-3, -4)).toBe(5);
    });

    it('handles axis-aligned distance', () => {
      expect(computeDistance(7, 0)).toBe(7);
      expect(computeDistance(0, 7)).toBe(7);
    });
  });

  // ─── clampValue ──────────────────────────────────────────────────

  describe('clampValue', () => {
    it('returns value when within range', () => {
      expect(clampValue(5, 0, 10)).toBe(5);
    });

    it('clamps to min when below', () => {
      expect(clampValue(-5, 0, 10)).toBe(0);
    });

    it('clamps to max when above', () => {
      expect(clampValue(15, 0, 10)).toBe(10);
    });

    it('returns boundary values exactly', () => {
      expect(clampValue(0, 0, 10)).toBe(0);
      expect(clampValue(10, 0, 10)).toBe(10);
    });
  });

  // ─── computeSelectionRect ─────────────────────────────────────────

  describe('computeSelectionRect', () => {
    it('handles top-left to bottom-right drag', () => {
      expect(computeSelectionRect(10, 20, 50, 60)).toEqual({
        x: 10,
        y: 20,
        width: 40,
        height: 40
      });
    });

    it('handles bottom-right to top-left drag', () => {
      expect(computeSelectionRect(50, 60, 10, 20)).toEqual({
        x: 10,
        y: 20,
        width: 40,
        height: 40
      });
    });

    it('handles zero-size rect (same point)', () => {
      expect(computeSelectionRect(10, 20, 10, 20)).toEqual({
        x: 10,
        y: 20,
        width: 0,
        height: 0
      });
    });

    it('handles negative coordinates', () => {
      expect(computeSelectionRect(-50, -30, -10, -5)).toEqual({
        x: -50,
        y: -30,
        width: 40,
        height: 25
      });
    });
  });
});
