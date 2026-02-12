/**
 * SpreadLine Constructors - TypeScript port of Python utils/constructors.py
 *
 * Functions for constructing egocentric networks:
 * - filterTimeByEgo: Filter timestamps where ego exists
 * - constructEgocentricNetwork: Extract 2-hop BFS network
 * - findWithinConstraints: Determine ordering constraints
 */

import { TopologyRow } from './types';
import { groupBy, unique } from './helpers';

const HOP_LIMIT = 2;

/**
 * Filter data to only include timestamps where the ego is present
 */
export function filterTimeByEgo(ego: string, data: TopologyRow[]): TopologyRow[] {
  // Get all unique timestamps
  const timestampSet = new Set(data.map(row => String(row.time)));
  const timestamps = [...timestampSet];

  // Group data by time
  const groupedByTime = groupBy(data, row => String(row.time));

  // Find timestamps where ego is not present
  const invalidTimestamps = new Set<string>();
  for (const time of timestamps) {
    const group = groupedByTime[time] || [];
    const nodes = new Set<string>();
    for (const row of group) {
      nodes.add(row.source);
      nodes.add(row.target);
    }
    if (!nodes.has(ego)) {
      invalidTimestamps.add(time);
    }
  }

  // Filter to only valid timestamps
  return data.filter(row => !invalidTimestamps.has(String(row.time)));
}

/**
 * Construct an egocentric network for a given ego node
 * Returns edges within 2-hop neighborhood of ego at each timestamp
 */
export function constructEgocentricNetwork(ego: string, data: TopologyRow[]): TopologyRow[] {
  // Reset indices (create new array with indices)
  const indexedData = data.map((row, index) => ({ ...row, _index: index }));

  // Get all unique entities
  const allEntities = new Set<string>();
  for (const row of indexedData) {
    allEntities.add(row.source);
    allEntities.add(row.target);
  }

  if (!allEntities.has(ego)) {
    throw new Error('Ego is not found in the data with the given time range.');
  }

  // Collect indices of edges to include
  const includedIndices = new Set<number>();

  // Group by time
  const groupedByTime = groupBy(indexedData, row => String(row.time));

  for (const timeKey of Object.keys(groupedByTime)) {
    const entries = groupedByTime[timeKey];
    let waitlist = new Set<string>([ego]);
    let hop = 1;

    while (waitlist.size > 0 && hop <= HOP_LIMIT) {
      const nextWaitlist: string[] = [];

      for (const each of waitlist) {
        // Find edges where 'each' is the target (sources pointing to 'each')
        const sources = entries.filter(row => row.target === each);
        // Find edges where 'each' is the source (targets of 'each')
        const targets = entries.filter(row => row.source === each);

        // Collect candidate neighbors
        const candidates: string[] = [...sources.map(row => row.source), ...targets.map(row => row.target)];

        // Add indices to included set
        for (const row of sources) {
          includedIndices.add(row._index!);
        }
        for (const row of targets) {
          includedIndices.add(row._index!);
        }

        nextWaitlist.push(...candidates);
      }

      // Update waitlist: remove nodes we've already processed
      const newWaitlist = new Set(nextWaitlist);
      for (const node of waitlist) {
        newWaitlist.delete(node);
      }
      waitlist = newWaitlist;
      hop++;
    }
  }

  // Return the filtered data (remove the temporary _index property)
  return data.filter((_, index) => includedIndices.has(index));
}

/**
 * Get entities from grouped result
 */
function getEntities(groupedEntities: [string, number][]): string[] {
  return groupedEntities.map(item => item[0]);
}

/**
 * Order entities within a constraint group by weight and category
 */
function orderWithin(
  constraints: [string, string, number][],
  entityColor: Record<string, string>,
  ascending: boolean = true
): [Record<number, string[]>, string[]] {
  const result: Record<number, string[]> = {};
  const sortedEntities: string[] = [];

  // Sort constraints by weight
  // ascending == false -> reverse == true -> descending -> ordering targets
  // ascending == true -> reverse == false -> ascending -> ordering sources
  const sorted = [...constraints].sort((a, b) => {
    const diff = a[2] - b[2];
    return ascending ? diff : -diff;
  });

  // Extract entities: source if ascending, target if descending
  const entities: [string, number][] = sorted.map(c => (ascending ? [c[0], c[2]] : [c[1], c[2]]));

  if (entities.length === 0) {
    return [result, sortedEntities];
  }

  // Group entities by weight
  const weightGroups: Record<number, string[]> = {};
  for (const [entity, weight] of entities) {
    if (!weightGroups[weight]) {
      weightGroups[weight] = [];
    }
    if (!weightGroups[weight].includes(entity)) {
      weightGroups[weight].push(entity);
    }
  }

  // Get sorted weights
  const weights = Object.keys(weightGroups).map(Number);
  weights.sort((a, b) => (ascending ? a - b : b - a));

  let counter = 0;
  for (const weight of weights) {
    let groupEntities = weightGroups[weight];

    // Sort entities by their categories, then by name for deterministic ordering
    groupEntities.sort((a, b) => {
      const colorA = entityColor[a] || '';
      const colorB = entityColor[b] || '';
      if (colorA !== colorB) {
        return colorA.localeCompare(colorB);
      }
      return a.localeCompare(b);
    });

    // Reverse every other group
    if (counter % 2 === 1) {
      groupEntities = groupEntities.reverse();
    }

    result[weight] = groupEntities;
    sortedEntities.push(...groupEntities);
    counter++;
  }

  return [result, sortedEntities];
}

/**
 * Find ordering constraints within entries
 * Returns: [constraints, order]
 *   constraints: [twoHopTops, sourceGroup, [ego], targetGroup, twoHopBottoms]
 *   order (hops): [[top-2-hop], [sources], [ego], [targets], [bottom-2-hop]]
 */
export function findWithinConstraints(entries: TopologyRow[], ego: string, entityColor: Record<string, string>): [any[], string[][]] {
  // Get raw tuples: (source, target, weight)
  const raws: [string, string, number][] = entries.map(row => [row.source, row.target, row.weight]);

  // Build constraint set, handling bidirectional edges
  const constraintMap = new Map<string, [string, string, number]>();

  for (const [source, target, weight] of raws) {
    const key = `${source}|${target}`;
    const reverseKey = `${target}|${source}`;

    // Check for bidirectional edge
    const bidirection = constraintMap.get(reverseKey);

    if (bidirection) {
      const otherWeight = bidirection[2];
      if (otherWeight > weight) {
        // Keep the other direction, remove this one if it exists
        constraintMap.delete(key);
        continue;
      }
      if (otherWeight === weight) {
        // Same weight: ignore both direction constraints
        constraintMap.delete(reverseKey);
        continue;
      }
    }
    constraintMap.set(key, [source, target, weight]);
  }

  const constraints = Array.from(constraintMap.values());

  // Separate constraints into source (-> ego) and target (ego ->)
  const sourceConstraints = constraints.filter(c => c[1] === ego);
  const targetConstraints = constraints.filter(c => c[0] === ego);

  const [sourceGroup, sources] = orderWithin(sourceConstraints, entityColor, true);
  const [targetGroup, targets] = orderWithin(targetConstraints, entityColor, false);
  const oneHops = [...sources, ...targets];

  // Handle remaining constraints (two-hop neighbors)
  const remainedConstraints = constraints.filter(c => c[0] !== ego && c[1] !== ego);

  // Sort by weight in descending order
  remainedConstraints.sort((a, b) => b[2] - a[2]);

  const twoHopTops: string[] = [];
  const twoHopBottoms: string[] = [];
  const twoHops: string[] = [];

  for (const [source, target, weight] of remainedConstraints) {
    if (oneHops.includes(source) && oneHops.includes(target)) {
      continue;
    }

    if (oneHops.includes(target) && !oneHops.includes(source)) {
      // source is ego's two-hop neighbor
      if (sources.includes(target)) {
        // source -> target -> ego, place above ego
        if (!twoHops.includes(source)) {
          twoHopTops.push(source);
        }
      } else if (targets.includes(target)) {
        // ego -> target; source -> target; place below ego
        if (!twoHops.includes(source)) {
          twoHopBottoms.push(source);
        }
      }
    } else if (oneHops.includes(source) && !oneHops.includes(target)) {
      // target is two-hop neighbor
      if (sources.includes(source)) {
        // source -> ego; source -> target; place above ego
        if (!twoHops.includes(target)) {
          twoHopTops.push(target);
        }
      } else if (targets.includes(source)) {
        // ego -> source -> target; place below ego
        if (!twoHops.includes(target)) {
          twoHopBottoms.push(target);
        }
      }
    }
    // Update twoHops tracker
    twoHops.length = 0;
    twoHops.push(...twoHopTops, ...twoHopBottoms);
  }

  const order: string[][] = [twoHopTops, sources, [ego], targets, twoHopBottoms];
  const result: any[] = [twoHopTops, sourceGroup, [ego], targetGroup, twoHopBottoms];

  return [result, order];
}
