/**
 * SpreadLine Helpers - TypeScript port of Python utils/helpers.py
 *
 * Utility functions for:
 * - Time/date conversions
 * - Array operations (NumPy equivalents)
 * - Data validation
 */

import { TopologyRow } from './types';

/**
 * Convert string to Date object using a format string
 * Supports formats: %Y (year), %m (month), %d (day), %H (hour), %M (minute), %S (second)
 */
export function strToDatetime(time: string, timeformat: string): Date {
  // Handle simple year format
  if (timeformat === '%Y') {
    return new Date(parseInt(time), 0, 1);
  }

  // Parse format string to extract date components
  let year = 1970,
    month = 0,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0;

  // Common formats
  if (timeformat === '%Y-%m-%d') {
    const parts = time.split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    day = parseInt(parts[2]);
  } else if (timeformat === '%Y-%m-%d %H:%M:%S') {
    const [datePart, timePart] = time.split(' ');
    const dateParts = datePart.split('-');
    const timeParts = timePart.split(':');
    year = parseInt(dateParts[0]);
    month = parseInt(dateParts[1]) - 1;
    day = parseInt(dateParts[2]);
    hour = parseInt(timeParts[0]);
    minute = parseInt(timeParts[1]);
    second = parseInt(timeParts[2]);
  } else {
    // Generic parser - try to match format patterns
    let timeIdx = 0;
    let formatIdx = 0;

    while (formatIdx < timeformat.length && timeIdx < time.length) {
      if (timeformat[formatIdx] === '%' && formatIdx + 1 < timeformat.length) {
        const spec = timeformat[formatIdx + 1];
        let numStr = '';

        // Extract numeric value
        while (timeIdx < time.length && /\d/.test(time[timeIdx])) {
          numStr += time[timeIdx];
          timeIdx++;
        }

        const num = parseInt(numStr) || 0;

        switch (spec) {
          case 'Y':
            year = num;
            break;
          case 'm':
            month = num - 1;
            break;
          case 'd':
            day = num;
            break;
          case 'H':
            hour = num;
            break;
          case 'M':
            minute = num;
            break;
          case 'S':
            second = num;
            break;
        }
        formatIdx += 2;
      } else {
        formatIdx++;
        timeIdx++;
      }
    }
  }

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Convert Date object to string using a format string
 */
export function datetimeToStr(time: Date, timeformat: string): string {
  const pad = (n: number, width: number = 2): string => String(n).padStart(width, '0');

  if (timeformat === '%Y') {
    return String(time.getFullYear());
  }

  let result = timeformat;
  result = result.replace('%Y', String(time.getFullYear()));
  result = result.replace('%m', pad(time.getMonth() + 1));
  result = result.replace('%d', pad(time.getDate()));
  result = result.replace('%H', pad(time.getHours()));
  result = result.replace('%M', pad(time.getMinutes()));
  result = result.replace('%S', pad(time.getSeconds()));

  return result;
}

/**
 * Generate an array of dates given the extents and time delta
 * Returns one more time point than the range for aggregation purposes
 */
export function getTimeArray(extents: [string, string], timeDelta: string, timeformat: string): string[] {
  if (timeDelta === 'year') {
    const result: string[] = [];
    const startYear = parseInt(extents[0]);
    const endYear = parseInt(extents[1]);
    for (let year = startYear; year <= endYear + 1; year++) {
      result.push(String(year));
    }
    return result;
  }

  const start = strToDatetime(extents[0], timeformat);
  const end = strToDatetime(extents[1], timeformat);
  const result: string[] = [];

  if (timeDelta === 'month') {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    for (let idx = 0; idx < months + 2; idx++) {
      const date = new Date(start);
      date.setMonth(date.getMonth() + idx);
      result.push(datetimeToStr(date, timeformat));
    }
    return result;
  }

  const delta = end.getTime() - start.getTime();

  if (timeDelta === 'hour') {
    const hours = Math.floor(delta / (1000 * 60 * 60));
    for (let idx = 0; idx < hours + 2; idx++) {
      const date = new Date(start.getTime() + idx * 60 * 60 * 1000);
      result.push(datetimeToStr(date, timeformat));
    }
    return result;
  }

  if (timeDelta === 'week') {
    const weeks = Math.floor(delta / (1000 * 60 * 60 * 24 * 7));
    for (let idx = 0; idx < weeks + 2; idx++) {
      const date = new Date(start.getTime() + idx * 7 * 24 * 60 * 60 * 1000);
      result.push(datetimeToStr(date, timeformat));
    }
    return result;
  }

  if (timeDelta === 'day') {
    const days = Math.floor(delta / (1000 * 60 * 60 * 24));
    for (let idx = 0; idx < days + 2; idx++) {
      const date = new Date(start.getTime() + idx * 24 * 60 * 60 * 1000);
      result.push(datetimeToStr(date, timeformat));
    }
    return result;
  }

  throw new Error(`The given delta "${timeDelta}" is not supported`);
}

/**
 * Order the array indices based on their value in ascending order, excluding zero elements
 * Returns the sorted entity ids/indices based on their ordering
 *
 * Equivalent to Python: nonzeroIndices[np.argsort(arr[nonzeroIndices])]
 */
export function sparseArgsort(arr: number[]): number[] {
  // Get indices where value is not zero
  const nonzeroIndices: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      nonzeroIndices.push(i);
    }
  }

  // Sort nonzero indices by their values in ascending order
  nonzeroIndices.sort((a, b) => arr[a] - arr[b]);

  return nonzeroIndices;
}

/**
 * Validate and rename columns in data array based on config
 */
export function checkValidity<T extends Record<string, any>>(recipient: T[], config: Record<string, string>, rules: string[]): T[] {
  // Check if all rules are present in config keys
  for (const rule of rules) {
    if (!(rule in config)) {
      throw new Error(`Unmatched keys in the config: missing "${rule}"`);
    }
  }

  // Check if all config values are present in data columns
  if (recipient.length > 0) {
    const columns = Object.keys(recipient[0]);
    for (const value of Object.values(config)) {
      if (!columns.includes(value)) {
        throw new Error(`Unmatched values in the config: column "${value}" not found`);
      }
    }
  }

  // Create inverse config mapping (value -> key)
  const invConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    invConfig[value] = key;
  }

  // Rename columns and remove duplicates
  const seen = new Set<string>();
  const result: T[] = [];

  for (const row of recipient) {
    const newRow: Record<string, any> = {};
    for (const [oldKey, value] of Object.entries(row)) {
      const newKey = invConfig[oldKey] || oldKey;
      newRow[newKey] = value;
    }

    // Create a string key for deduplication
    const key = JSON.stringify(newRow);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(newRow as T);
    }
  }

  return result;
}

// ============================================================================
// NumPy-like Array Utility Functions
// ============================================================================

/**
 * Create a 1D array filled with a value
 */
export function full<T>(length: number, value: T): T[] {
  return Array(length).fill(value);
}

/**
 * Create a 2D array filled with a value
 */
export function full2D<T>(rows: number, cols: number, value: T): T[][] {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(value));
}

/**
 * Create a 2D array filled with NaN
 */
export function nanFull(rows: number, cols: number): number[][] {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(NaN));
}

/**
 * Get indices where array values are non-zero
 */
export function nonzero(arr: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Get indices that would sort an array
 */
export function argsort(arr: number[]): number[] {
  return arr
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
    .map(item => item.index);
}

/**
 * Get unique values from an array (preserves order of first occurrence)
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Check if values from array a are in array b
 */
export function isin<T>(a: T[], b: T[]): boolean[] {
  const bSet = new Set(b);
  return a.map(x => bSet.has(x));
}

/**
 * Count how many values from array a are in array b
 */
export function isinCount<T>(a: T[], b: T[]): number {
  const bSet = new Set(b);
  return a.filter(x => bSet.has(x)).length;
}

/**
 * Get minimum value from array, ignoring NaN
 */
export function nanMin(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x));
  return valid.length > 0 ? Math.min(...valid) : NaN;
}

/**
 * Get maximum value from array, ignoring NaN
 */
export function nanMax(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x));
  return valid.length > 0 ? Math.max(...valid) : NaN;
}

/**
 * Get column from 2D array
 */
export function getColumn<T>(arr: T[][], colIdx: number): T[] {
  return arr.map(row => row[colIdx]);
}

/**
 * Set column in 2D array (mutates original)
 */
export function setColumn<T>(arr: T[][], colIdx: number, values: T[]): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i][colIdx] = values[i];
  }
}

/**
 * Get row from 2D array
 */
export function getRow<T>(arr: T[][], rowIdx: number): T[] {
  return arr[rowIdx];
}

/**
 * Transpose a 2D array
 */
export function transpose<T>(arr: T[][]): T[][] {
  if (arr.length === 0) return [];
  const rows = arr.length;
  const cols = arr[0].length;
  const result: T[][] = [];
  for (let j = 0; j < cols; j++) {
    result.push([]);
    for (let i = 0; i < rows; i++) {
      result[j].push(arr[i][j]);
    }
  }
  return result;
}

/**
 * Group array by a key function
 */
export function groupBy<T, K extends string | number>(arr: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Find unique values in a column of a 2D array at given indices
 */
export function uniqueAtIndices<T>(arr: T[][], indices: number[], colIdx: number): T[] {
  const values = indices.map(i => arr[i][colIdx]);
  return unique(values);
}

/**
 * Get indices where condition is true in array
 */
export function where(arr: boolean[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) result.push(i);
  }
  return result;
}

/**
 * Check if all elements in an array are true (or truthy)
 */
export function all(arr: boolean[]): boolean {
  return arr.every(x => x);
}

/**
 * Check if any element in an array is true (or truthy)
 */
export function any(arr: boolean[]): boolean {
  return arr.some(x => x);
}

/**
 * Sum of array elements
 */
export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Deep copy a 2D array
 */
export function copy2D<T>(arr: T[][]): T[][] {
  return arr.map(row => [...row]);
}

/**
 * Stack two 1D arrays vertically (like np.vstack for 1D arrays)
 */
export function vstack(arr1: number[], arr2: number[]): number[][] {
  return arr1.map((v, i) => [v, arr2[i]]);
}
