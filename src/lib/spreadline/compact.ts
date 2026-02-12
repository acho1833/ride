/**
 * SpreadLine Compact - TypeScript port of Python compact.py
 *
 * Minimizes whitespace while maintaining visual clarity.
 * Supports two modes: 'space' or 'line' minimization.
 *
 * This is the most complex module (~800 lines in Python).
 */

import { Session } from './types';
import { nanFull, full2D, nanMin, nanMax, unique, copy2D } from './helpers';
import type { SpreadLine } from './spreadline';

// Constants
const DISTANCE_LINE = 5; // Between lines
const DISTANCE_HOP = 10; // Between hop levels
const DISTANCE_SESSION = 5; // Between ego and idle sessions
let SQUEEZE_LINE = 5; // Between same-category entities

const THROUGH = false;

/**
 * Check if two values are on the same side (above/below ego)
 */
function areOnSameSide(oneSide: string | number, otherSide: string | number): boolean {
  if (typeof oneSide === 'string' && typeof otherSide === 'string') {
    return oneSide === otherSide;
  } else if (typeof oneSide !== 'string' && typeof otherSide !== 'string') {
    return Math.sign(oneSide) === Math.sign(otherSide);
  } else {
    // One is string, one is number - normalize
    let numVal: number, strVal: string;
    if (typeof oneSide === 'string') {
      strVal = oneSide;
      numVal = otherSide as number;
    } else {
      numVal = oneSide as number;
      strVal = otherSide as string;
    }
    const sign = Math.sign(numVal);
    if (sign === 1 && strVal === 'below') return true;
    if (sign === -1 && strVal === 'above') return true;
    return false;
  }
}

/**
 * Check if entities have different hop identities
 */
function haveDifferentIdentity(session: Session | null, oneEntity: string, otherEntity: string): string {
  if (!session || !(session instanceof Session)) return 'same';

  const identity = session.getIdentity(oneEntity);
  const otherIdentity = session.getIdentity(otherEntity);

  let result = 'same';
  if (identity !== otherIdentity) result = 'different';

  if ([identity, otherIdentity].includes(2)) {
    if (Math.abs(identity - otherIdentity) === 1) result = 'ego 1-level';
    if (Math.abs(identity - otherIdentity) === 2) result = 'ego 2-level';
  }

  return result;
}

/**
 * Determine distance between consecutive entities
 */
function determineDistance(
  liner: SpreadLine,
  currIdx: number,
  prevIdx: number,
  session: Session | null = null,
  idle: boolean = false
): number {
  const colors = liner._line_color;
  const names = liner.entities_names;
  let distance = DISTANCE_LINE;
  let squeezeLine = DISTANCE_LINE;

  if (liner._config.squeezeSameCategory) squeezeLine = 2;

  if (colors[names[currIdx]] === colors[names[prevIdx]] && colors[names[currIdx]] !== undefined) {
    distance = squeezeLine;
  }

  if (idle) return squeezeLine;
  if (!session) return distance;

  const result = haveDifferentIdentity(session, names[currIdx], names[prevIdx]);
  if (result === 'ego 2-level' || result === 'different') distance = DISTANCE_HOP;
  if (result === 'ego 1-level') distance = DISTANCE_LINE;

  return distance;
}

/**
 * Construct slots for sessions across timestamps
 */
function constructSlots(
  liner: SpreadLine,
  orderedEntities: number[][],
  orderedSessions: number[][],
  sessionAlignTable: Record<number, number>[]
): [number[][], (number | number[])[][], number] {
  const sessionTable = liner._tables.session;
  const [, numTimestamps] = liner.span;
  const ego = liner.egoIdx;
  const egoSessions = sessionTable[ego];

  // Initialize with first timestamp's sessions
  const slots: number[][] = [orderedSessions[0].slice()];
  let egoSlotIdx = orderedSessions[0].indexOf(egoSessions[0]);

  for (let cIdx = 1; cIdx < numTimestamps; cIdx++) {
    const dealt = new Set<number>();

    // Ensure ego's session always goes into the same slot
    const egoSessionID = egoSessions[cIdx];

    // Extend each slot
    for (const slot of slots) {
      slot.push(-1); // Default to unassigned
    }

    slots[egoSlotIdx][cIdx] = egoSessionID;
    dealt.add(egoSessionID);

    // Get current sessions and alignment
    const sessions = orderedSessions[cIdx];
    const alignment = sessionAlignTable[cIdx - 1];
    const egoSessionOrder = sessions.indexOf(egoSessionID);

    // Assign aligned sessions to their slots
    for (let rIdx = 0; rIdx < slots.length; rIdx++) {
      if (rIdx === egoSlotIdx) continue;

      const prevSessionID = slots[rIdx][cIdx - 1];
      let insertSessionID = alignment[prevSessionID] ?? -1;

      // Ensure ego sessions stay aligned
      if (insertSessionID === egoSessionID) insertSessionID = -1;

      slots[rIdx][cIdx] = insertSessionID;
      if (insertSessionID !== -1) dealt.add(insertSessionID);
    }

    // Handle unassigned sessions
    const unassigned = new Set(sessions.filter(s => !dealt.has(s)));
    const aboveSessions = sessions
      .slice(0, egoSessionOrder)
      .filter(s => unassigned.has(s))
      .reverse();
    const belowSessions = sessions.slice(egoSessionOrder + 1).filter(s => unassigned.has(s));

    // Assign above sessions (closest to ego first)
    for (const session of aboveSessions) {
      for (let slotIdx = egoSlotIdx - 1; slotIdx >= 0; slotIdx--) {
        if (slots[slotIdx][cIdx] !== -1 || !unassigned.has(session)) continue;
        slots[slotIdx][cIdx] = session;
        unassigned.delete(session);
      }
    }

    // Assign below sessions
    for (const session of belowSessions) {
      for (let slotIdx = egoSlotIdx + 1; slotIdx < slots.length; slotIdx++) {
        if (slots[slotIdx][cIdx] !== -1 || !unassigned.has(session)) continue;
        slots[slotIdx][cIdx] = session;
        unassigned.delete(session);
      }
    }

    // Create new slots for remaining unassigned sessions
    const remainingUnassigned = Array.from(unassigned).sort((a, b) => sessions.indexOf(a) - sessions.indexOf(b));

    for (const session of remainingUnassigned) {
      const order = sessions.indexOf(session);
      const newSlot: number[] = Array(cIdx).fill(-1);
      newSlot.push(session);

      if (order === 0) {
        slots.unshift(newSlot);
        egoSlotIdx++;
      } else if (order === sessions.length - 1) {
        slots.push(newSlot);
      } else {
        const currentSpots = slots.map(slot => slot[cIdx]);
        const prevIdx = currentSpots.indexOf(sessions[order - 1]);
        slots.splice(prevIdx + 1, 0, newSlot);
        if (prevIdx < egoSlotIdx) egoSlotIdx++;
      }
    }
  }

  // Build slotsInEntities
  const slotsInEntities: (number | number[])[][] = slots.map(slot => slot.map(() => -1));

  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    for (let rIdx = 0; rIdx < slots.length; rIdx++) {
      const session = slots[rIdx][cIdx];
      if (session === -1) continue;

      const entities = orderedEntities[cIdx];
      const sessionEntities = entities.filter(entityIdx => sessionTable[entityIdx][cIdx] === session);
      slotsInEntities[rIdx][cIdx] = sessionEntities;
    }
  }

  return [slots, slotsInEntities, egoSlotIdx];
}

/**
 * Build side table - track entities that cross the ego line
 */
function buildSideTable(liner: SpreadLine, heightTable: number[][]): number[][] {
  const [numEntities] = liner.span;
  const sideTable = full2D(numEntities, 1, 0);

  for (let rIdx = 0; rIdx < numEntities; rIdx++) {
    const validHeights = heightTable[rIdx].filter(h => !isNaN(h));
    const signs = unique(validHeights.map(h => Math.sign(h)));
    if (signs.length === 2) {
      sideTable[rIdx][0] = 1;
    }
  }

  return sideTable;
}

/**
 * Compute session height for space minimization mode
 */
function computeSessionHeightSpace(
  liner: SpreadLine,
  slots: number[][],
  slotsInEntities: (number | number[])[][],
  egoSlotIdx: number,
  through: boolean
): number[][] {
  const [numEntities, numTimestamps] = liner.span;
  const heightTable = nanFull(numEntities, numTimestamps);
  const ego = liner.egoIdx;
  const blockRange = full2D(2, numTimestamps, -1);

  // Process ego sessions first
  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    const entities = slotsInEntities[egoSlotIdx][cIdx];
    if (entities === -1 || !Array.isArray(entities)) continue;

    const sessionID = slots[egoSlotIdx][cIdx];
    const session = liner.getSessionByID(sessionID);
    const egoIdx = (entities as number[]).indexOf(ego);

    // Initialize heights for entities in this session
    const heights: number[] = [0];
    for (let idx = 1; idx < (entities as number[]).length; idx++) {
      const rIdx = (entities as number[])[idx];
      const distance = determineDistance(liner, rIdx, (entities as number[])[idx - 1], session);
      heights.push(heights[heights.length - 1] + distance);
    }

    // Center on ego
    const egoHeight = heights[egoIdx];
    for (let i = 0; i < heights.length; i++) {
      heights[i] -= egoHeight;
    }

    // Update block range and height table
    blockRange[0][cIdx] = Math.min(...heights);
    blockRange[1][cIdx] = Math.max(...heights);

    for (let i = 0; i < (entities as number[]).length; i++) {
      heightTable[(entities as number[])[i]][cIdx] = heights[i];
    }
  }

  // Compute idle session heights
  return computeIdleSessionHeight(liner, heightTable, slots, slotsInEntities, egoSlotIdx, blockRange, through);
}

/**
 * Compute idle session heights
 */
function computeIdleSessionHeight(
  liner: SpreadLine,
  heightTable: number[][],
  slots: number[][],
  slotsInEntities: (number | number[])[][],
  egoSlotIdx: number,
  blockRange: number[][],
  through: boolean
): number[][] {
  const [, numTimestamps] = liner.span;
  const assign: Record<number, Record<number, number>> = {};

  // Helper to check if a position is available
  function isAvailable(number: number, cIdx: number, heights: number[]): boolean {
    const throughFlag = through && blockRange[0][cIdx] < number && number < blockRange[1][cIdx];
    const notConflict = blockRange[0][cIdx] > number || number > blockRange[1][cIdx];
    const sameRange = blockRange[0][cIdx] === blockRange[1][cIdx];
    return (throughFlag || notConflict || sameRange) && !heights.includes(number);
  }

  // Process each timestamp
  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    const sessions = slots.map(slot => slot[cIdx]);
    const heights = heightTable.map(row => row[cIdx]);

    for (let slotIdx = 0; slotIdx < sessions.length; slotIdx++) {
      const session = sessions[slotIdx];
      if (session === -1 || session === slots[egoSlotIdx][cIdx]) continue;

      const entities = slotsInEntities[slotIdx][cIdx];
      if (entities === -1 || !Array.isArray(entities) || entities.length !== 1) continue;

      const rIdx = entities[0];
      const direction = slotIdx < egoSlotIdx ? 'above' : 'below';

      if (!assign[rIdx]) assign[rIdx] = {};

      // Find left and right non-NaN heights
      let leftCIdx = cIdx - 1;
      while (leftCIdx >= 0 && isNaN(heightTable[rIdx][leftCIdx])) leftCIdx--;
      let rightCIdx = cIdx + 1;
      while (rightCIdx < numTimestamps && isNaN(heightTable[rIdx][rightCIdx])) rightCIdx++;

      const leftSide = leftCIdx >= 0 ? heightTable[rIdx][leftCIdx] : NaN;
      const rightSide = rightCIdx < numTimestamps ? heightTable[rIdx][rightCIdx] : NaN;
      const sameSide = !isNaN(leftSide) && !isNaN(rightSide) && areOnSameSide(leftSide, rightSide);

      // Calculate positions
      let abovePos = blockRange[0][cIdx];
      let belowPos = blockRange[1][cIdx];
      while (heights.includes(abovePos)) abovePos -= DISTANCE_SESSION;
      while (heights.includes(belowPos)) belowPos += DISTANCE_SESSION;

      let assignment: number;
      if (!sameSide) {
        assignment = direction === 'above' ? abovePos : belowPos;
        if (!isNaN(leftSide) && areOnSameSide(assignment, leftSide) && isAvailable(leftSide, cIdx, heights)) {
          assignment = leftSide;
        }
        if (!isNaN(rightSide) && areOnSameSide(assignment, rightSide) && isAvailable(rightSide, cIdx, heights)) {
          assignment = rightSide;
        }
      } else if (areOnSameSide(leftSide, direction)) {
        assignment = direction === 'above' ? abovePos : belowPos;
        if (!isNaN(leftSide) && areOnSameSide(assignment, leftSide) && isAvailable(leftSide, cIdx, heights)) {
          assignment = leftSide;
        }
        if (!isNaN(rightSide) && areOnSameSide(assignment, rightSide) && isAvailable(rightSide, cIdx, heights)) {
          assignment = rightSide;
        }
      } else {
        assignment = Math.sign(leftSide) === -1 ? abovePos : belowPos;
      }

      heights[rIdx] = assignment;
      assign[rIdx][cIdx] = assignment;
    }
  }

  // Apply assignments to height table
  for (const [rIdxStr, assignments] of Object.entries(assign)) {
    const rIdx = parseInt(rIdxStr);
    for (const [cIdxStr, height] of Object.entries(assignments)) {
      const cIdx = parseInt(cIdxStr);
      heightTable[rIdx][cIdx] = height;
    }
  }

  return heightTable;
}

/**
 * Find range of same values in an array, optionally checking same side
 */
function findSameRange(nums: number[], idx: number, heights: number[], sameSide: boolean = false): [number, number] {
  const value = nums[idx];
  let start = idx;
  while (start > 0 && nums[start - 1] === value) {
    if (sameSide && !areOnSameSide(heights[idx], heights[start - 1])) break;
    start--;
  }
  let end = idx;
  while (end < nums.length - 1 && nums[end + 1] === value) {
    if (sameSide && !areOnSameSide(heights[idx], heights[end + 1])) break;
    end++;
  }
  return [start, end + 1];
}

/**
 * Get neighbor index in array
 */
function getNeighborIndex(nums: (boolean | number)[], val: boolean | number, direction: number = 1): number {
  const numsList = Array.from(nums);
  if (!numsList.includes(val)) return -1;
  if (direction === 1) {
    return numsList.length - 1 - numsList.slice().reverse().indexOf(val);
  }
  return numsList.indexOf(val);
}

/**
 * Compute session height for line minimization mode (full port from Python)
 */
function computeSessionHeightLine(
  liner: SpreadLine,
  slots: number[][],
  slotsInEntities: (number | number[])[][],
  egoSlotIdx: number,
  through: boolean
): number[][] {
  const [numEntities, numTimestamps] = liner.span;
  const heightTable = nanFull(numEntities, numTimestamps);
  const ego = liner.egoIdx;
  const names = liner.entities_names;
  const presenceTable = liner._tables.presence;
  const effectiveTimestamps = liner.effective_timestamps;
  const allTimestamps = liner._all_timestamps;

  if (liner._config.squeezeSameCategory) SQUEEZE_LINE = 2;

  // Initialize block and session tracking
  const block: Record<number, number[]> = {};
  const sessions: Record<number, number> = {};
  // Use Map to preserve insertion order (JS objects with numeric keys sort by key!)
  const assign = new Map<number, number[]>();

  // First pass: initialize ego session heights
  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    const entities = slotsInEntities[egoSlotIdx][cIdx];
    if (entities === -1 || !Array.isArray(entities)) continue;

    const sessionID = slots[egoSlotIdx][cIdx];
    const session = liner.getSessionByID(sessionID);
    const egoIdx = (entities as number[]).indexOf(ego);

    const heights: number[] = [0];
    for (let idx = 1; idx < (entities as number[]).length; idx++) {
      const rIdx = (entities as number[])[idx];
      const distance = determineDistance(liner, rIdx, (entities as number[])[idx - 1], session);
      heights.push(heights[heights.length - 1] + distance);
    }

    // Center on ego
    const egoHeight = heights[egoIdx];
    for (let i = 0; i < heights.length; i++) {
      heights[i] -= egoHeight;
    }

    // Track for alignment
    const entitiesArr = entities as number[];
    for (const rIdx of [...entitiesArr.slice(0, egoIdx).reverse(), ...entitiesArr.slice(egoIdx + 1)]) {
      if (!assign.has(rIdx)) assign.set(rIdx, []);
      assign.get(rIdx)!.push(cIdx);
    }

    block[cIdx] = entitiesArr;
    sessions[cIdx] = sessionID;

    for (let i = 0; i < entitiesArr.length; i++) {
      heightTable[entitiesArr[i]][cIdx] = heights[i];
    }
  }

  const referenceTable = copy2D(heightTable);
  const dealt: Record<number, boolean> = {};
  const idleDealt: Record<number, Record<number, boolean>> = {};

  // Helper function to get block range
  function getBlockRange(cIdx: number): [number, number] {
    const currentBlock = block[cIdx].map(idx => heightTable[idx][cIdx]);
    const pointRadius = 2;
    return [nanMin(currentBlock) - pointRadius, nanMax(currentBlock) + pointRadius];
  }

  // Helper to get other ordered heights
  function getOtherOrderedHeights(heights: number[], egoIdx: number): [number[], number[]] {
    const indexed = heights
      .map((h, i) => ({ h, i }))
      .filter(({ h, i }) => !isNaN(h) && i !== egoIdx)
      .sort((a, b) => a.h - b.h);
    return [indexed.map(x => x.h), indexed.map(x => x.i)];
  }

  // Check if updating entity position affects others
  function shouldUpdate(
    rIdx: number,
    assignHeight: number,
    currHeights: number[],
    reference: number[],
    restEntities: number[],
    direction: number = 1
  ): [boolean, number[]] {
    const result: boolean[] = [];
    const differences: number[] = [];

    for (const entity of restEntities) {
      const desiredDifference = (reference[entity] - reference[rIdx]) * direction;
      const currDifference = (currHeights[entity] - assignHeight) * direction;
      let difference = desiredDifference;

      if (isNaN(desiredDifference)) {
        // Idle session
        const assumedDifference = determineDistance(liner, rIdx, entity, null, true);
        const withinDifferences = differences.filter(d => !isNaN(d)).map(d => Math.abs(d - currDifference) < assumedDifference);

        if ((currHeights[entity] === assignHeight || withinDifferences.some(v => v)) && dealt[entity]) {
          result.push(false);
        }
        differences.push(difference);
        continue;
      }

      const assumedDifference = determineDistance(liner, rIdx, entity, null, true);
      const withinDifferences = differences.filter(d => !isNaN(d)).map(d => Math.abs(d - currDifference) < 1.75);

      const unaffected = currDifference > desiredDifference;
      const shouldBeMoved = currDifference < desiredDifference && !dealt[entity];

      if (unaffected && !withinDifferences.some(v => v)) {
        difference = currDifference;
      }
      if (unaffected && withinDifferences.some(v => v)) {
        const candidates = differences.filter((d, i) => !isNaN(d) && withinDifferences[i]);
        if (candidates.length > 0) {
          difference = Math.max(...candidates) + 1.75;
        }
      }

      differences.push(difference);
      result.push(unaffected || shouldBeMoved);
    }

    return [result.every(v => v), differences];
  }

  // Assign height to non-idle entities
  function assignNonidleEntity(
    rIdx: number,
    cIdx: number,
    assignHeight: number,
    curr: number,
    reference: number[],
    restEntities: number[],
    direction: number = 1
  ): [number[], number[]] {
    const result: number[] = [];
    const resultEntities: number[] = [];

    const unavailable = direction === 1 ? assignHeight < curr : assignHeight > curr;
    if (unavailable) {
      return [resultEntities, result];
    }

    const currHeights = heightTable.map(r => r[cIdx]);
    const [canUpdate, differences] = shouldUpdate(rIdx, assignHeight, currHeights, reference, restEntities, direction);

    if (canUpdate) {
      result.push(assignHeight);
      resultEntities.push(rIdx);
      for (let i = 0; i < restEntities.length; i++) {
        const entity = restEntities[i];
        const difference = differences[i];
        if (isNaN(difference)) continue;
        result.push(assignHeight + difference * direction);
        resultEntities.push(entity);
      }
    }

    return [resultEntities, result];
  }

  // Assign height to idle entities with multiple strategies
  function assignIdleEntity(
    cIdx: number,
    rIdx: number,
    assignHeight: number,
    assumedDifference: number,
    orderEntities: number[],
    toBeMoved: boolean[],
    direction: number = 1
  ): [number[], number[], string] {
    const restEntities = orderEntities.filter((_, i) => toBeMoved[i]);
    const blockRange = getBlockRange(cIdx);
    const insideBlock = restEntities.map(e => blockRange[0] <= heightTable[e][cIdx] && heightTable[e][cIdx] <= blockRange[1]);
    const notDealt = restEntities.map(e => !dealt[e]);

    let result: number[] = [];
    let resultEntities: number[] = [];

    // Strategy 1: All dealt with - try simple insert
    if (notDealt.every(v => !v)) {
      result.push(0);
      resultEntities.push(rIdx);
      for (let idx = 0; idx < restEntities.length; idx++) {
        const each = restEntities[idx];
        resultEntities.push(each);
        const currDifference = (heightTable[each][cIdx] - assignHeight) * direction;
        const minimalDifference = determineDistance(liner, each, rIdx, null, true);
        if (currDifference >= minimalDifference) {
          result.push(heightTable[each][cIdx] - assignHeight);
        } else {
          break;
        }
      }
      if (result.length === resultEntities.length) {
        return [resultEntities, result, 'simple insert'];
      }
      result = [];
      resultEntities = [];
    }
    // Strategy 2: All inside block and none dealt - simple push
    else if (insideBlock.every(v => v) && notDealt.every(v => v)) {
      result.push(0);
      resultEntities.push(rIdx);
      const orderedRest = direction === -1 ? [...restEntities].reverse() : restEntities;
      for (let idx = 0; idx < orderedRest.length; idx++) {
        const each = orderedRest[idx];
        resultEntities.push(each);
        let desiredDifference = assumedDifference * direction;
        const another = idx !== 0 ? orderedRest[idx - 1] : orderEntities[getNeighborIndex(toBeMoved, false, direction)];
        if (another !== undefined && block[cIdx]?.includes(another) && block[cIdx]?.includes(each)) {
          desiredDifference = determineDistance(liner, another, each, liner.getSessionByID(sessions[cIdx])) * direction;
        }
        result.push(result[result.length - 1] + desiredDifference);
      }
      return [resultEntities, result, 'simple push'];
    }
    // Strategy 3: Undealt are inside block, dealt are outside - whole block push
    else if (
      notDealt.every((v, i) => !v || insideBlock[i]) &&
      !notDealt.some((v, i) => v && !insideBlock[i]) &&
      !insideBlock.some((v, i) => v && !notDealt[i])
    ) {
      const hypothetical = restEntities.map(e => heightTable[e][cIdx] + assumedDifference * direction);
      const dealtEntities = hypothetical.filter((_, i) => !notDealt[i]);
      const undealtEntities = hypothetical.filter((_, i) => notDealt[i]);

      if (dealtEntities.length > 0 && undealtEntities.length > 0) {
        const dealtBoundary = direction === 1 ? Math.min(...dealtEntities) : Math.max(...dealtEntities);
        const undealtBoundary = direction === 1 ? Math.max(...undealtEntities) : Math.min(...undealtEntities);
        const difference = Math.abs(dealtBoundary - undealtBoundary);

        if (difference > 5) {
          result.push(0);
          resultEntities.push(rIdx);
          for (let idx = 0; idx < restEntities.length; idx++) {
            resultEntities.push(restEntities[idx]);
            if (notDealt[idx]) {
              result.push(hypothetical[idx] - assignHeight);
            } else {
              result.push(heightTable[restEntities[idx]][cIdx] - assignHeight);
            }
          }
          return [resultEntities, result, 'whole block push'];
        }
      }
    }
    // Strategy 4: Partial block push
    else if (notDealt.every((v, i) => !v || insideBlock[i]) && insideBlock.some((v, i) => v && !notDealt[i])) {
      const hypothetical = restEntities.map(e => heightTable[e][cIdx] + assumedDifference * direction);
      const move = new Array(restEntities.length).fill(false);
      const moving =
        direction === 1
          ? Array.from({ length: restEntities.length - 1 }, (_, i) => i)
          : Array.from({ length: restEntities.length - 1 }, (_, i) => restEntities.length - 1 - i);
      const begin = direction === 1 ? 0 : restEntities.length - 1;
      let insert = false;

      for (const idx of moving) {
        const entity = restEntities[idx];
        const nextEntity = direction === 1 ? restEntities[idx + 1] : restEntities[idx - 1];

        if (idx === begin) {
          const minimalDifference = determineDistance(liner, entity, rIdx, null, true);
          const toBeDifference = (heightTable[entity][cIdx] - assignHeight) * direction;
          if (toBeDifference > minimalDifference) {
            insert = true;
            break;
          }
        }

        let minimalDifference = determineDistance(liner, entity, nextEntity, null, true);
        if (block[cIdx]?.includes(entity) && block[cIdx]?.includes(nextEntity)) {
          minimalDifference = determineDistance(liner, entity, nextEntity, liner.getSessionByID(sessions[cIdx]));
        }
        const toBeDifference =
          direction === 1 ? heightTable[nextEntity][cIdx] - hypothetical[idx] : hypothetical[idx] - heightTable[nextEntity][cIdx];

        if (toBeDifference > minimalDifference) {
          if (direction === 1) {
            for (let i = 0; i <= idx; i++) move[i] = true;
          } else {
            for (let i = idx; i < move.length; i++) move[i] = true;
          }
          break;
        }
      }

      if (move.some(v => v) || insert) {
        result.push(0);
        resultEntities.push(rIdx);
        for (let idx = 0; idx < restEntities.length; idx++) {
          resultEntities.push(restEntities[idx]);
          if (move[idx]) {
            result.push(hypothetical[idx] - assignHeight);
          } else {
            result.push(heightTable[restEntities[idx]][cIdx] - assignHeight);
          }
        }
        return [resultEntities, result, 'partial block push'];
      }
    }

    // Strategy 5: Last resort - find insertion point
    const currHeights = orderEntities.map(e => heightTable[e][cIdx]);

    function continueInsertionSearch(assign: number, heights: number[], baseline: number): boolean {
      for (const height of heights) {
        if (Math.abs(height - assign) < baseline) return true;
      }
      return false;
    }

    let counter = 0;
    const base = assignHeight;
    let searchAssign = assignHeight;
    while (continueInsertionSearch(searchAssign, currHeights, assumedDifference)) {
      const negation = counter % 2 === 0 ? 1 : -1;
      searchAssign = base + assumedDifference * direction * negation * (Math.floor(counter / 2) + 1);
      counter++;
      if (counter > 10) break;
    }

    return [[rIdx], [searchAssign - base], 'idle last insertion'];
  }

  // Determine target height considering presence table
  function determineHeight(rIdx: number, times: number[], cIdx: number): number {
    const timeline = times.map(t => heightTable[rIdx][t]);
    const presence = presenceTable[rIdx];
    const checkSameSide = presenceTable[rIdx][cIdx] === 1;

    const [start, end] = findSameRange(presence, cIdx, heightTable[rIdx], checkSameSide);
    const selection = heightTable[rIdx].slice(start, end);

    if (presenceTable[rIdx][cIdx] === -1 && selection.every(v => isNaN(v))) {
      const candidates = [start > 0 ? heightTable[rIdx][start - 1] : NaN, end < heightTable[rIdx].length ? heightTable[rIdx][end] : NaN];
      if (areOnSameSide(candidates[0], candidates[1])) return candidates[0];
      if (Math.abs(candidates[0]) < Math.abs(candidates[1])) return candidates[0];
      return candidates[1];
    } else if (presenceTable[rIdx][cIdx] === -1) {
      const candidates = selection.filter(v => !isNaN(v));
      if (candidates.length > 0) return candidates[0];
    }

    const validTimeline = timeline.filter(v => !isNaN(v));
    if (validTimeline.length === 0) return heightTable[rIdx][cIdx];

    const height = Math.sign(validTimeline[0]) === 1 ? Math.max(...validTimeline) : Math.min(...validTimeline);

    const threshold = 50;
    if (Math.abs(height - heightTable[rIdx][cIdx]) > threshold) {
      return heightTable[rIdx][cIdx];
    }

    return height;
  }

  // Check if position has no conflict
  function isNotConflict(assignment: number, cIdx: number, rIdx: number): boolean {
    const heights = heightTable.map(r => r[cIdx]).filter((h, i) => !isNaN(h) && i !== rIdx);
    for (const h of heights) {
      if (Math.abs(h - assignment) < DISTANCE_SESSION) return false;
    }
    return true;
  }

  // Stretch to reduce wiggles
  function stretchToReduceWiggles(rIdx: number, heights: number[], timestamps: number[], direction: string): void {
    let assignment = direction === 'above' ? Math.min(...heights) : Math.max(...heights);
    let order = [...new Set(heights)].sort((a, b) => a - b);
    if (direction === 'above') order = order.reverse();

    for (const candidate of order) {
      if (timestamps.every(cIdx => isNotConflict(candidate, cIdx, rIdx))) {
        assignment = candidate;
        for (const cIdx of timestamps) {
          heightTable[rIdx][cIdx] = assignment;
        }
        return;
      }
    }

    while (!timestamps.every(cIdx => isNotConflict(assignment, cIdx, rIdx))) {
      assignment += direction === 'above' ? -DISTANCE_SESSION : DISTANCE_SESSION;
    }
    for (const cIdx of timestamps) {
      heightTable[rIdx][cIdx] = assignment;
    }
  }

  // Main processing loop
  for (const [rIdx, times] of assign) {
    if (times.length === 1) continue;
    dealt[rIdx] = true;

    for (let cIdx = times[0]; cIdx <= times[times.length - 1]; cIdx++) {
      const height = determineHeight(rIdx, times, cIdx);
      const [otherHeights, orderedOthers] = getOtherOrderedHeights(
        heightTable.map(r => r[cIdx]),
        ego
      );

      if (!idleDealt[cIdx]) idleDealt[cIdx] = {};

      if (orderedOthers.includes(rIdx)) {
        // Non-idle session
        const curr = heightTable[rIdx][cIdx];
        if (curr === height || !areOnSameSide(curr, height)) continue;

        const order = orderedOthers.indexOf(rIdx);
        const restEntities = Math.sign(height) === 1 ? orderedOthers.slice(order + 1) : orderedOthers.slice(0, order).reverse();

        const [resultEntities, result] = assignNonidleEntity(
          rIdx,
          cIdx,
          height,
          curr,
          referenceTable.map(r => r[cIdx]),
          restEntities,
          Math.sign(height)
        );

        if (result.length === 0) continue;

        for (let i = 0; i < resultEntities.length; i++) {
          heightTable[resultEntities[i]][cIdx] = result[i];
        }
      } else {
        // Idle session
        idleDealt[cIdx][rIdx] = true;
        const SQUEEZE = 2;
        const assumedDifference = SQUEEZE;
        const detectRange = otherHeights.map(h => h + SQUEEZE * Math.sign(height));
        const toBeMoved = detectRange.map(h => (Math.sign(height) === 1 ? h > height : h < height));
        const hasContactNodes = orderedOthers.filter(
          (e, i) => toBeMoved[i] && (presenceTable[e][cIdx] === 1 || heightTable[e][cIdx] === height)
        );

        if (toBeMoved.filter(v => v).length === 0 || hasContactNodes.length === 0) {
          heightTable[rIdx][cIdx] = height;
          continue;
        }

        const [resultEntities, result] = assignIdleEntity(
          cIdx,
          rIdx,
          height,
          assumedDifference,
          orderedOthers,
          toBeMoved,
          Math.sign(height)
        );

        if (result.length === 0) continue;

        for (let i = 0; i < resultEntities.length; i++) {
          heightTable[resultEntities[i]][cIdx] = height + result[i];
        }
      }
    }
  }

  return heightTable;
}

/**
 * Main compacting function
 *
 * @param liner - SpreadLine instance
 * @param orderedEntities - Ordered entity indices per timestamp
 * @param orderedSessions - Ordered session IDs per timestamp
 * @param sessionAlignTable - Session alignment mappings
 * @returns [heightTable, sideTable]
 */
export function compacting(
  liner: SpreadLine,
  orderedEntities: number[][],
  orderedSessions: number[][],
  sessionAlignTable: Record<number, number>[]
): [number[][], number[][]] {
  const focus = liner._config.minimize;

  // Construct slots
  const [slots, slotsInEntities, egoSlotIdx] = constructSlots(liner, orderedEntities, orderedSessions, sessionAlignTable);

  // Compute heights based on minimization mode
  let heightTable: number[][];
  if (focus === 'space') {
    heightTable = computeSessionHeightSpace(liner, slots, slotsInEntities, egoSlotIdx, THROUGH);
  } else {
    heightTable = computeSessionHeightLine(liner, slots, slotsInEntities, egoSlotIdx, THROUGH);
  }

  // Build side table
  const sideTable = buildSideTable(liner, heightTable);

  // Normalize heights (shift so minimum is 0)
  const allHeights = heightTable.flat().filter(h => !isNaN(h));
  const minHeight = Math.min(...allHeights);
  const minOffset = Math.abs(minHeight);

  for (let i = 0; i < heightTable.length; i++) {
    for (let j = 0; j < heightTable[i].length; j++) {
      if (!isNaN(heightTable[i][j])) {
        heightTable[i][j] += minOffset;
      } else {
        heightTable[i][j] = -1;
      }
    }
  }

  // Verify ego has consistent height
  const egoHeights = unique(heightTable[liner.egoIdx].filter(h => h !== -1));
  if (egoHeights.length !== 1) {
    console.warn('Warning: Ego should only have one height, found:', egoHeights);
  }

  return [heightTable, sideTable];
}
