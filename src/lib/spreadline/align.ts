/**
 * SpreadLine Align - TypeScript port of Python align.py
 *
 * Uses longest common substring (LCS) algorithm to maximize
 * straight lines between consecutive timestamps.
 */

import { Session } from './types';
import { full2D, isinCount } from './helpers';
import type { SpreadLine } from './spreadline';

const ALPHA = 0.1; // Reward factor for order similarity

/**
 * Get list of entities in the session where the given entity is in
 */
function getEntitiesInSession(rIdx: number, cIdx: number, liner: SpreadLine, orderedIdleEntities: number[]): number[] {
  // Get the sessionID given the entity id and the timestamp
  const sessionID = liner.entities[rIdx].getAtTimestamp(cIdx);
  const idleLocations = new Set(liner.locations.idle);
  const sessionTable = liner._tables.session;

  // Get the Session instance given the id
  const session = liner.getSessionByID(sessionID);

  // Return the indices of the entities of a session at given timestamp
  if (idleLocations.has(sessionID)) {
    return orderedIdleEntities;
  }

  return session ? session.getEntityIDs() : [];
}

/**
 * Compute rewards for aligning entities across consecutive timestamps
 *
 * The reward is the possible maximum number of straight lines plus
 * the similarity of their relative orders.
 * Ego always has infinite reward to ensure straight line.
 */
function computeRewards(liner: SpreadLine, orderedEntities: number[][], orderedIdleEntities: number[][]): number[][][] {
  const [, numTimestamps] = liner.span;
  const rewards: number[][][] = [];
  const ego = liner.egoIdx;

  for (let cIdx = 0; cIdx < numTimestamps - 1; cIdx++) {
    const currentReward: number[][] = [];
    const currentEntities = orderedEntities[cIdx];
    const nextEntities = orderedEntities[cIdx + 1];

    for (let currOrder = 0; currOrder < currentEntities.length; currOrder++) {
      const currEnt = currentEntities[currOrder];
      const currEntReward: number[] = [];

      for (let nextOrder = 0; nextOrder < nextEntities.length; nextOrder++) {
        const nextEnt = nextEntities[nextOrder];
        let reward = 0;

        // Get entities in the sessions containing current and next entity
        const currSessionEntIds = getEntitiesInSession(currEnt, cIdx, liner, orderedIdleEntities[cIdx]);
        const nextSessionEntIds = getEntitiesInSession(nextEnt, cIdx + 1, liner, orderedIdleEntities[cIdx + 1]);

        // straight(l_i, r_j): maximum number of straight lines from alignment
        const numStraightLines = isinCount(currSessionEntIds, nextSessionEntIds);
        reward += numStraightLines;

        // Similarity of the relative order
        const compatibility =
          ALPHA * (1 - Math.abs((currOrder + 1) / currSessionEntIds.length - (nextOrder + 1) / nextSessionEntIds.length));
        reward += compatibility;

        // If comparing ego across timestamps, ensure straight line by maximizing reward
        if (currEnt === ego && nextEnt === ego) {
          reward = Infinity;
        }

        currEntReward.push(reward);
      }
      currentReward.push(currEntReward);
    }
    rewards.push(currentReward);
  }

  return rewards;
}

/**
 * Longest common substring using dynamic programming
 * Finds alignment that maximizes total reward
 *
 * @returns Mapping from current indices to next indices
 */
function longestCommonSubstring(currLength: number, nextLength: number, reward: number[][]): Record<number, number> {
  // Initialize match table
  const matchTable: Record<number, Record<number, number>> = {};
  for (let i = 0; i < currLength; i++) {
    matchTable[i] = {};
    for (let j = 0; j < nextLength; j++) {
      matchTable[i][j] = 0;
    }
  }

  // Direction table for backtracking
  const direction: Record<number, Record<number, number>> = {};
  for (let i = 0; i < currLength; i++) {
    direction[i] = {};
    for (let j = 0; j < nextLength; j++) {
      const candidates = [
        (matchTable[i - 1]?.[j - 1] ?? 0) + reward[i][j], // i and j should be aligned
        matchTable[i]?.[j - 1] ?? 0, // i should not align with j
        matchTable[i - 1]?.[j] ?? 0 // j should not align with i
      ];

      const maxValue = Math.max(...candidates);
      const maxIdx = candidates.indexOf(maxValue);

      matchTable[i][j] = maxValue;
      direction[i][j] = maxIdx;
    }
  }

  // Backtrack to build alignment table
  const alignTable: Record<number, number> = {};
  let currPtr = currLength - 1;
  let nextPtr = nextLength - 1;

  while (currPtr >= 0 && nextPtr >= 0) {
    const dir = direction[currPtr][nextPtr];

    if (dir === 0) {
      // Aligned
      alignTable[currPtr] = nextPtr;
      currPtr--;
      nextPtr--;
    } else if (dir === 1) {
      // Entity in nextTime is not aligning with anyone
      nextPtr--;
    } else if (dir === 2) {
      // Entity in currentTime is not aligning with anyone
      currPtr--;
    } else {
      break;
    }
  }

  return alignTable;
}

/**
 * Align sessions based on entity alignment table
 */
function alignSessions(liner: SpreadLine, alignTable: number[][], orderedEntities: number[][]): Record<number, number>[] {
  const sessionTable = liner._tables.session;
  const ego = liner.egoIdx;
  const [, numTimestamps] = liner.span;
  const sessionAlignTable: Record<number, number>[] = [];

  for (let cIdx = 0; cIdx < numTimestamps - 1; cIdx++) {
    const aligned: Record<number, number> = {};
    const orderedEnts = orderedEntities[cIdx];

    // Ego must be aligned to itself
    if (orderedEnts.includes(ego)) {
      const sessionID = sessionTable[ego][cIdx];
      const alignedSessionID = sessionTable[ego][cIdx + 1];
      aligned[sessionID] = alignedSessionID;
    }

    // Process other entities
    for (const cha of orderedEnts) {
      if (cha === ego) continue;

      const sessionID = sessionTable[cha][cIdx];
      const alignedEntity = alignTable[cha][cIdx];
      let alignedSessionID = -1;

      if (alignedEntity !== -1) {
        // It is aligned to someone
        alignedSessionID = sessionTable[alignedEntity][cIdx + 1];
        if (alignedSessionID === 0) alignedSessionID = -1;
      }

      // If this session has not been aligned yet
      const alreadyAligned = aligned[sessionID];
      const alignedValues = Object.values(aligned);

      if (alreadyAligned === undefined || alreadyAligned === -1) {
        if (alignedSessionID !== -1 && alignedValues.includes(alignedSessionID)) {
          // To-be-aligned session is already taken by another session
          aligned[sessionID] = alignedSessionID;
        } else {
          aligned[sessionID] = alignedSessionID;
        }
      }
    }

    sessionAlignTable.push(aligned);
  }

  return sessionAlignTable;
}

/**
 * Main aligning function
 *
 * Uses LCS algorithm to maximize straight lines between timestamps.
 *
 * @param liner - SpreadLine instance
 * @param orderedEntities - Ordered entity indices per timestamp
 * @param orderedIdleEntities - Ordered idle entity indices per timestamp
 * @returns [alignTable, sessionAlignTable]
 */
export function aligning(
  liner: SpreadLine,
  orderedEntities: number[][],
  orderedIdleEntities: number[][]
): [number[][], Record<number, number>[]] {
  const [numEntities, numTimestamps] = liner.span;

  // Compute rewards for alignment
  const rewards = computeRewards(liner, orderedEntities, orderedIdleEntities);

  // Initialize align table with -1 (no alignment)
  const alignTable = full2D(numEntities, numTimestamps, -1);

  // Process each consecutive timestamp pair
  for (let cIdx = 0; cIdx < numTimestamps - 1; cIdx++) {
    const alignment = longestCommonSubstring(orderedEntities[cIdx].length, orderedEntities[cIdx + 1].length, rewards[cIdx]);

    // Populate align table
    for (const [currEntStr, nextEnt] of Object.entries(alignment)) {
      const currEnt = parseInt(currEntStr);
      const currEntityIdx = orderedEntities[cIdx][currEnt];
      const nextEntityIdx = orderedEntities[cIdx + 1][nextEnt];
      alignTable[currEntityIdx][cIdx] = nextEntityIdx;
    }
  }

  // Align sessions based on entity alignments
  const sessionAlignTable = alignSessions(liner, alignTable, orderedEntities);

  return [alignTable, sessionAlignTable];
}
