import 'server-only';

import { promises as fs } from 'fs';
import Papa from 'papaparse';

export interface RelationRow {
  year: string;
  sourceId: string;
  targetId: string;
  id: string;
  type: string;
  citationcount?: number;
}

/** In-memory cache: file path -> parsed rows */
const csvCache = new Map<string, unknown[]>();

/** Parse a CSV file with headers and dynamic typing. Results are cached in memory. */
export async function loadCSV<T>(filePath: string): Promise<T[]> {
  const cached = csvCache.get(filePath);
  if (cached) return cached as T[];

  const content = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse<T>(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  csvCache.set(filePath, result.data);
  return result.data;
}

/** Clear the CSV cache (for testing and cleanup) */
export function clearCSVCache(): void {
  csvCache.clear();
}
