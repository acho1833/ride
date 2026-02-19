/**
 * SpreadLine Contextualize - TypeScript port of Python contextualize.py
 *
 * Maps contextual content attributes to 2D positions.
 * Handles dynamic vs static layouts and normalization.
 */

import { ContentLayoutRow } from './types';
import type { SpreadLine } from './spreadline';

export interface LayoutEntry {
  entity: string;
  timestamp: number;
  posX: number;
  posY: number;
  label: number | string;
}

export interface ContextResult {
  layout: Map<string, LayoutEntry>; // key: "entity,timestamp"
}

/**
 * Collect profiles from content for each entity in each session
 */
function collectProfiles(
  liner: SpreadLine,
  content: ContentLayoutRow[],
  config: { dynamic: boolean; generated: boolean },
  missing: string = 'closest'
): LayoutEntry[] {
  const profiles: LayoutEntry[] = [];

  for (const session of liner.sessions) {
    const time = liner._all_timestamps[session.timestamp];
    const entities = session.printEntities();

    for (const entity of entities) {
      // Find candidates for this entity
      const candidates = content.filter(row => row.id === entity);
      if (candidates.length === 0) continue;

      let match: ContentLayoutRow | null = null;

      if (config.dynamic) {
        // Try to find exact timestamp match
        const exactMatch = candidates.find(c => String(c.timestamp) === String(time));
        if (exactMatch) {
          match = exactMatch;
        } else if (missing === 'closest' && candidates.length > 0) {
          // Find closest timestamp
          const timestamps = candidates.map(c => String(c.timestamp)).sort();
          let bisectIdx = timestamps.findIndex(t => t >= time);
          if (bisectIdx === -1) bisectIdx = timestamps.length;
          bisectIdx = Math.max(0, bisectIdx - 1);
          const closestTimestamp = timestamps[bisectIdx];
          match = candidates.find(c => String(c.timestamp) === closestTimestamp) || candidates[0];
        }
      } else {
        // Static layout - should only have one entry per entity
        if (candidates.length > 1) {
          throw new Error('Multiple matches when static layout is specified');
        }
        match = candidates[0];
      }

      if (match) {
        profiles.push({
          entity: entity,
          timestamp: session.timestamp,
          posX: match.posX,
          posY: match.posY,
          label: -1
        });
      }
    }
  }

  return profiles;
}

/**
 * Normalize layout positions to [0, 1] range
 */
function normalizeLayout(layout: LayoutEntry[]): LayoutEntry[] {
  if (layout.length === 0) return layout;

  const posXValues = layout.map(l => l.posX);
  const posYValues = layout.map(l => l.posY);

  const minX = Math.min(...posXValues);
  const maxX = Math.max(...posXValues);
  const minY = Math.min(...posYValues);
  const maxY = Math.max(...posYValues);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return layout.map(entry => ({
    ...entry,
    posX: (entry.posX - minX) / rangeX,
    posY: (entry.posY - minY) / rangeY
  }));
}

/**
 * Center layout on ego position
 */
function centerLayout(layout: LayoutEntry[], ego: string): LayoutEntry[] {
  // Find ego entries
  const egoEntries = layout.filter(l => l.entity === ego);
  if (egoEntries.length === 0) return layout;

  // Get unique ego position
  const uniquePositions = new Set(egoEntries.map(e => `${e.posX},${e.posY}`));
  if (uniquePositions.size !== 1) {
    throw new Error('The layout is dynamic, centering is not recommended due to information loss');
  }

  const centerX = egoEntries[0].posX;
  const centerY = egoEntries[0].posY;

  // Helper to clamp values to [0, 1]
  const distort = (val: number): number => val; // Can add clamping if needed

  return layout.map(entry => ({
    ...entry,
    posX: distort(entry.posX - centerX + 0.5),
    posY: distort(entry.posY - centerY + 0.5)
  }));
}

/**
 * Main contextualizing function
 *
 * @param liner - SpreadLine instance
 * @param normalize - Whether to normalize positions to [0, 1]
 * @param centered - Whether to center on ego position
 * @returns Context result with layout map
 */
export function contextualizing(liner: SpreadLine, normalize: boolean = true, centered: boolean = false): ContextResult {
  const config = liner._content_config;
  const ego = liner.ego;

  // Empty layout if no content provided
  if (!liner._content || liner._content.length === 0) {
    return { layout: new Map() };
  }

  // Filter content to entities in the network
  const entityNames = new Set(liner.entities_names);
  const content = liner._content.filter(row => entityNames.has(row.id));

  // Collect profiles
  let layout = collectProfiles(liner, content, config);

  // Add label field
  layout = layout.map(entry => ({ ...entry, label: -1 }));

  // Normalize and center if requested
  if (normalize) {
    layout = normalizeLayout(layout);
  }
  if (centered) {
    layout = centerLayout(layout, ego);
  }

  // Convert to map for O(1) lookup
  const layoutMap = new Map<string, LayoutEntry>();
  for (const entry of layout) {
    const key = `${entry.entity},${entry.timestamp}`;
    layoutMap.set(key, entry);
  }

  return { layout: layoutMap };
}
