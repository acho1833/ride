/**
 * SpreadLine Library
 *
 * A visualization framework for exploring egocentric dynamic networks.
 * This library can be used both server-side (Node.js) and client-side (browser).
 *
 * Usage:
 * ```typescript
 * import { SpreadLine } from '@/lib/spreadline';
 *
 * const spreadline = new SpreadLine();
 * spreadline.load(topology, { source: 'source', target: 'target', time: 'time', weight: 'weight' });
 * spreadline.center('ego_node_name', undefined, 'year', '%Y');
 * const result = spreadline.fit(1400, 500);
 * ```
 */

export { SpreadLine } from './spreadline';
export { ordering } from './order';
export { aligning } from './align';
export { compacting } from './compact';
export { contextualizing } from './contextualize';
export { rendering } from './render';

// Export types
export type {
  Path,
  Node,
  Entity,
  Session,
  TopologyRow,
  EntityColorRow,
  NodeContextRow,
  ContentLayoutRow,
  RenderConfig,
  SpreadLineResult,
  StorylineResult,
  MarkResult,
  LabelResult,
  InlineLabelResult,
  BlockResult,
  PointResult
} from './types';

export type { ContextResult, LayoutEntry } from './contextualize';

// Re-export helper functions that might be useful
export { strToDatetime, datetimeToStr, getTimeArray, unique, groupBy } from './helpers';
