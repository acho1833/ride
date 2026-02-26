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

export async function loadCSV<T>(filePath: string): Promise<T[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse<T>(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  return result.data;
}
