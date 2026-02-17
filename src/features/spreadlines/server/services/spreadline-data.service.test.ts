/**
 * @jest-environment node
 */

jest.mock('@orpc/server', () => ({
  ORPCError: class ORPCError extends Error {
    constructor(code: string, opts?: { message?: string }) {
      super(opts?.message ?? code);
    }
  }
}));

import { getSpreadlineRawData } from './spreadline-data.service';

describe('spreadline-data.service', () => {
  describe('getSpreadlineRawData', () => {
    it('returns expected top-level fields', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022]
      });

      expect(typeof result.egoId).toBe('string');
      expect(result.egoId).toMatch(/^p\d{4}$/);
      expect(result.dataset).toBe('vis-author2');
      expect(Array.isArray(result.topology)).toBe(true);
      expect(typeof result.entities).toBe('object');
      expect(typeof result.groups).toBe('object');
    });

    it('returns entities map with name, category, and citations', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022]
      });

      expect(Object.keys(result.entities).length).toBeGreaterThan(0);

      for (const [id, entity] of Object.entries(result.entities)) {
        expect(id).toMatch(/^p\d{4}$/);
        expect(typeof entity.name).toBe('string');
        expect(entity.name.length).toBeGreaterThan(0);
        expect(['internal', 'external']).toContain(entity.category);
        expect(typeof entity.citations).toBe('object');
      }
    });

    it('does not include ego entity in entities map', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022]
      });

      expect(result.entities[result.egoId]).toBeUndefined();
    });

    it('topology entries reference valid entity IDs', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022]
      });
      const allIds = new Set([...Object.keys(result.entities), result.egoId]);

      expect(result.topology.length).toBeGreaterThan(0);
      for (const entry of result.topology) {
        expect(entry.sourceId).toMatch(/^p\d{4}$/);
        expect(entry.targetId).toMatch(/^p\d{4}$/);
        expect(allIds.has(entry.sourceId)).toBe(true);
        expect(allIds.has(entry.targetId)).toBe(true);
      }
    });

    it('groups contain valid entity IDs', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022]
      });
      const allIds = new Set([...Object.keys(result.entities), result.egoId]);

      for (const [year, layers] of Object.entries(result.groups)) {
        expect(year).toMatch(/^\d{4}$/);
        expect(layers).toHaveLength(5);
        for (const layer of layers) {
          for (const id of layer) {
            expect(allIds.has(id)).toBe(true);
          }
        }
      }
    });

    it('citation keys in entities are valid year strings', async () => {
      const result = await getSpreadlineRawData({
        egoId: 'p1199',
        relationTypes: ['Co-co-author'],
        yearRange: [2002, 2022]
      });

      for (const entity of Object.values(result.entities)) {
        for (const [time, count] of Object.entries(entity.citations)) {
          expect(time).toMatch(/^\d{4}$/);
          expect(typeof count).toBe('number');
        }
      }
    });
  });
});
