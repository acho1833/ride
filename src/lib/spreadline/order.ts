/**
 * SpreadLine Order - TypeScript port of Python order.py
 *
 * Performs ordering of sessions using barycenter algorithm
 * to minimize edge crossings through forward/backward sweeping.
 */

import { Node, Session } from './types';
import { sparseArgsort, full2D, unique } from './helpers';
import type { SpreadLine } from './spreadline';

/**
 * Bundle entities by timestamp, creating Session objects for idle sessions on demand
 */
function bundleEntitiesByTimestamp(liner: SpreadLine): Session[][] {
  const sessionTable = liner._tables.session;
  const numTimestamps = liner._counts.numTimestamps;
  const sessionsPerTimestamp: Session[][] = [];
  const idleLocations = new Set(liner.locations.idle);
  const names = liner.entities_names;

  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    const sessions: Session[] = [];

    // Get unique session IDs at this timestamp
    const sessionIDs = unique(sessionTable.map(row => row[cIdx]));

    for (const sessionID of sessionIDs) {
      if (sessionID === 0) continue;

      if (!idleLocations.has(sessionID)) {
        // Contact session - get from liner
        const session = liner.getSessionByID(sessionID);
        if (session) {
          sessions.push(session);
        }
      } else {
        // Idle session - create on demand
        const entityIDs: number[] = [];
        for (let rIdx = 0; rIdx < sessionTable.length; rIdx++) {
          if (sessionTable[rIdx][cIdx] === sessionID) {
            entityIDs.push(rIdx);
          }
        }
        entityIDs.sort((a, b) => a - b);

        const entities = entityIDs.map((id, idx) => new Node(names[id], sessionID, idx, -1, id));
        const session = new Session(sessionID, entities, 'idle');
        sessions.push(session);
      }
    }
    sessionsPerTimestamp.push(sessions);
  }

  return sessionsPerTimestamp;
}

/**
 * Sort entities within a constraint group by their barycenter leaf
 */
function withinSort(group: string[], session: Session, currNodes: Node[], sweepRange: [number, number]): void {
  const nodes = group.map(name => session.findNode(name) as Node).filter(n => n !== null);
  nodes.sort((a, b) => a.getBarycenterLeaf(currNodes) - b.getBarycenterLeaf(currNodes));
  session.replaceNode(nodes, sweepRange);
}

/**
 * Barycenter sort - order sessions at next/prev timestamp based on current timestamp
 */
function barycenterSort(currNodes: Node[], nextSessions: Session[]): Session[] {
  for (const session of nextSessions) {
    // For those in the same session, find how many exist in the previous session
    const existed = session.entities.map(node => node.findSelf(currNodes)).filter(n => n !== null) as Node[];

    // Calculate barycenter as average order of existing nodes
    const barycenter = existed.reduce((sum, node) => sum + node.order, 0);
    session.barycenter = barycenter / session.entityWeight;
  }

  // Sort sessions by barycenter
  nextSessions.sort((a, b) => a.barycenter - b.barycenter);

  // Update node orders based on new session order
  const allNodes = nextSessions.flatMap(session => session.entities);
  for (const session of nextSessions) {
    for (const node of session.entities) {
      node.order = allNodes.indexOf(node);
    }
  }

  return nextSessions;
}

/**
 * Constrained crossing reduction using barycenter algorithm
 */
function constrainedCrossingReduction(currentSessions: Session[], nextSessions: Session[]): Session[] {
  const currNodes = currentSessions.flatMap(session => session.entities);
  const result: Session[] = [];

  for (const session of nextSessions) {
    const constraints = session.constraints;

    if (constraints.length === 0) {
      result.push(session);
      continue;
    }

    const [topTwoHops, sourceGroup, , targetGroup, bottomTwoHops] = constraints;

    // Sort top 2-hop neighbors
    let sweepRange: [number, number] = [0, (topTwoHops as string[]).length];
    if ((topTwoHops as string[]).length > 1) {
      withinSort(topTwoHops as string[], session, currNodes, sweepRange);
    }

    // Sort source groups (by weight)
    if (typeof sourceGroup === 'object' && sourceGroup !== null && !Array.isArray(sourceGroup)) {
      for (const [weight, group] of Object.entries(sourceGroup as Record<number, string[]>)) {
        sweepRange = [sweepRange[1], sweepRange[1] + group.length];
        if (group.length > 1) {
          withinSort(group, session, currNodes, sweepRange);
        }
      }
    }

    // Skip ego (single element)
    sweepRange = [sweepRange[1], sweepRange[1] + 1];

    // Sort target groups (by weight)
    if (typeof targetGroup === 'object' && targetGroup !== null && !Array.isArray(targetGroup)) {
      for (const [weight, group] of Object.entries(targetGroup as Record<number, string[]>)) {
        sweepRange = [sweepRange[1], sweepRange[1] + group.length];
        if (group.length > 1) {
          withinSort(group, session, currNodes, sweepRange);
        }
      }
    }

    // Sort bottom 2-hop neighbors
    sweepRange = [sweepRange[1], sweepRange[1] + (bottomTwoHops as string[]).length];
    if ((bottomTwoHops as string[]).length > 1) {
      withinSort(bottomTwoHops as string[], session, currNodes, sweepRange);
    }

    result.push(session);
  }

  return barycenterSort(currNodes, nextSessions);
}

/**
 * Main ordering function - performs barycenter algorithm with forward/backward sweeping
 *
 * @param liner - SpreadLine instance
 * @param iteration - Number of iterations (default 10)
 * @returns [orderTable, orderedEntities, orderedIdleEntities, orderedSessions]
 */
export function ordering(liner: SpreadLine, iteration: number = 10): [number[][], number[][], number[][], number[][]] {
  let sessionsPerTimestamp = bundleEntitiesByTimestamp(liner);
  const numTimestamps = liner._counts.numTimestamps;
  const idleLocations = new Set(liner.locations.idle);
  const sessionTable = liner._tables.session;

  // Forward and backward sweeping
  for (let iter = 0; iter < iteration; iter++) {
    // Forward sweep
    for (let cIdx = 0; cIdx < numTimestamps - 1; cIdx++) {
      const currentSessions = sessionsPerTimestamp[cIdx];
      const nextSessions = sessionsPerTimestamp[cIdx + 1];
      sessionsPerTimestamp[cIdx + 1] = constrainedCrossingReduction(currentSessions, nextSessions);
    }

    // Backward sweep
    for (let cIdx = numTimestamps - 1; cIdx > 0; cIdx--) {
      const currentSessions = sessionsPerTimestamp[cIdx];
      const prevSessions = sessionsPerTimestamp[cIdx - 1];
      sessionsPerTimestamp[cIdx - 1] = constrainedCrossingReduction(currentSessions, prevSessions);
    }
  }

  // Populate the ordering results in the orderTable
  const [numEntities, numTimestampsCols] = liner.span;
  const orderTable = full2D(numEntities, numTimestampsCols, 0);

  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    const sessions = sessionsPerTimestamp[cIdx];
    const nodes = sessions.flatMap(session => session.entities);

    for (const node of nodes) {
      const rIdx = node.id;
      orderTable[rIdx][cIdx] = node.order + 1; // +1 because default order starts from 0
    }
  }

  // Build ordered entities arrays
  const orderedEntities: number[][] = [];
  const orderedIdleEntities: number[][] = [];
  const orderedSessions: number[][] = [];

  for (let cIdx = 0; cIdx < numTimestamps; cIdx++) {
    // Get column from orderTable
    const orderColumn = orderTable.map(row => row[cIdx]);

    // Get ordered entity indices (sparse argsort)
    const orderedEntity = sparseArgsort(orderColumn);
    orderedEntities.push(orderedEntity);

    // Get ordered idle entities
    const orderedIdleEntity = orderedEntity.filter(entityIdx => idleLocations.has(sessionTable[entityIdx][cIdx]));
    orderedIdleEntities.push(orderedIdleEntity);

    // Get ordered session IDs (preserving insertion order)
    const sessionIDs = orderedEntity.map(entityIdx => sessionTable[entityIdx][cIdx]);
    const seenSessions = new Set<number>();
    const orderedSession: number[] = [];
    for (const sessionID of sessionIDs) {
      if (!seenSessions.has(sessionID)) {
        seenSessions.add(sessionID);
        orderedSession.push(sessionID);
      }
    }
    orderedSessions.push(orderedSession);
  }

  return [orderTable, orderedEntities, orderedIdleEntities, orderedSessions];
}
