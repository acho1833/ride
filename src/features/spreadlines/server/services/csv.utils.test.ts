/**
 * @jest-environment node
 */

import path from 'path';
import { loadCSV, clearCSVCache } from './csv.utils';

describe('csv.utils', () => {
  describe('loadCSV', () => {
    it('parses a CSV file with headers and dynamic typing', async () => {
      const filePath = path.join(process.cwd(), 'data/spreadline/vis-author2/entities.csv');
      const rows = await loadCSV<{
        id: string;
        name: string;
        year: number;
        citationcount: number;
        affiliation: string;
      }>(filePath);

      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);

      const first = rows[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('year');
      expect(first).toHaveProperty('citationcount');
      expect(first).toHaveProperty('affiliation');

      // dynamicTyping should parse numbers
      expect(typeof first.citationcount).toBe('number');
    });

    it('throws on non-existent file', async () => {
      const badPath = path.join(process.cwd(), 'data/spreadline/does-not-exist.csv');
      await expect(loadCSV(badPath)).rejects.toThrow();
    });
  });

  describe('loadCSV caching', () => {
    afterEach(() => {
      clearCSVCache();
    });

    it('returns the same reference on repeated calls to the same path', async () => {
      const filePath = path.join(process.cwd(), 'data/spreadline/vis-author2/entities.csv');
      const result1 = await loadCSV(filePath);
      const result2 = await loadCSV(filePath);
      expect(result1).toBe(result2); // Same reference = cached
    });

    it('returns different data for different paths', async () => {
      const entitiesPath = path.join(process.cwd(), 'data/spreadline/vis-author2/entities.csv');
      const relationsPath = path.join(process.cwd(), 'data/spreadline/vis-author2/relations.csv');
      const entities = await loadCSV(entitiesPath);
      const relations = await loadCSV(relationsPath);
      expect(entities).not.toBe(relations);
    });

    it('re-parses after cache is cleared', async () => {
      const filePath = path.join(process.cwd(), 'data/spreadline/vis-author2/entities.csv');
      const result1 = await loadCSV(filePath);
      clearCSVCache();
      const result2 = await loadCSV(filePath);
      expect(result1).not.toBe(result2); // Different reference
      expect(result1).toEqual(result2); // Same content
    });
  });
});
