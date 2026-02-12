/**
 * @jest-environment node
 */

import { searchPattern, getPredicates } from './pattern-mock.service';

describe('pattern-mock.service', () => {
  describe('searchPattern', () => {
    it('returns empty for empty pattern', async () => {
      const result = await searchPattern({
        pattern: { nodes: [], edges: [] },
        pageSize: 10,
        pageNumber: 1
      });

      expect(result.matches).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('matches single node by type', async () => {
      const result = await searchPattern({
        pattern: {
          nodes: [
            {
              id: 'n1',
              label: 'Node A',
              type: 'Organization',
              filters: [{ attribute: 'labelNormalized', patterns: ['Google'] }],
              position: { x: 0, y: 0 }
            }
          ],
          edges: []
        },
        pageSize: 10,
        pageNumber: 1
      });

      expect(result.totalCount).toBeGreaterThan(0);
      for (const match of result.matches) {
        expect(match.entities[0].type).toBe('Organization');
        expect(match.entities[0].labelNormalized.toLowerCase()).toContain('google');
      }
    });

    it('matches two connected nodes', async () => {
      const result = await searchPattern({
        pattern: {
          nodes: [
            {
              id: 'n1',
              label: 'Node A',
              type: 'Organization',
              filters: [{ attribute: 'labelNormalized', patterns: ['Google'] }],
              position: { x: 0, y: 0 }
            },
            {
              id: 'n2',
              label: 'Node B',
              type: 'Organization',
              filters: [{ attribute: 'labelNormalized', patterns: ['*Cloud*'] }],
              position: { x: 100, y: 0 }
            }
          ],
          edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', predicates: [] }]
        },
        pageSize: 10,
        pageNumber: 1
      });

      expect(result.totalCount).toBeGreaterThan(0);
      for (const match of result.matches) {
        expect(match.entities.length).toBe(2);
        expect(match.relationships.length).toBeGreaterThan(0);
      }
    });

    it('respects predicate filter on edges', async () => {
      const result = await searchPattern({
        pattern: {
          nodes: [
            {
              id: 'n1',
              label: 'Node A',
              type: 'Organization',
              filters: [{ attribute: 'labelNormalized', patterns: ['Google'] }],
              position: { x: 0, y: 0 }
            },
            {
              id: 'n2',
              label: 'Node B',
              type: 'Organization',
              filters: [],
              position: { x: 100, y: 0 }
            }
          ],
          edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', predicates: ['manages'] }]
        },
        pageSize: 10,
        pageNumber: 1
      });

      expect(result.totalCount).toBeGreaterThan(0);
      for (const match of result.matches) {
        for (const rel of match.relationships) {
          expect(rel.predicate).toBe('manages');
        }
      }
    });

    it('paginates results', async () => {
      const params = {
        pattern: {
          nodes: [
            {
              id: 'n1',
              label: 'Node A',
              type: 'Person',
              filters: [],
              position: { x: 0, y: 0 }
            }
          ],
          edges: []
        },
        pageSize: 5,
        pageNumber: 1
      };

      const page1 = await searchPattern(params);
      const page2 = await searchPattern({ ...params, pageNumber: 2 });

      expect(page1.matches.length).toBe(5);
      expect(page2.matches.length).toBe(5);
      expect(page1.totalCount).toBe(page2.totalCount);
      // Different pages should have different entities
      const page1Ids = page1.matches.map(m => m.entities[0].id);
      const page2Ids = page2.matches.map(m => m.entities[0].id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('returns correct totalCount with window function', async () => {
      const result = await searchPattern({
        pattern: {
          nodes: [
            {
              id: 'n1',
              label: 'Node A',
              type: 'Person',
              filters: [],
              position: { x: 0, y: 0 }
            }
          ],
          edges: []
        },
        pageSize: 5,
        pageNumber: 1
      });

      // totalCount should be greater than pageSize (we have more than 5 Person entities)
      expect(result.totalCount).toBeGreaterThan(5);
      expect(result.matches.length).toBe(5);
    });
  });

  describe('getPredicates', () => {
    it('returns distinct predicates sorted', async () => {
      const predicates = await getPredicates();

      expect(predicates.length).toBeGreaterThan(0);
      expect(predicates).toContain('manages');
      expect(predicates).toContain('works_for');
      // Verify sorted
      for (let i = 1; i < predicates.length; i++) {
        expect(predicates[i - 1].localeCompare(predicates[i])).toBeLessThanOrEqual(0);
      }
    });
  });
});
