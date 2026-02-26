/**
 * @jest-environment node
 */

import path from 'path';
import { loadCSV } from './csv.utils';

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
});
