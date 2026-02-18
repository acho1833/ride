/**
 * Network Timeline Utilities
 *
 * Helper functions and demo data generation.
 */

import { COLOR_TIERS } from './const';
import type { CollaborationData, CollaborationNode, CollaborationLink, Collaborator } from './types';

/**
 * Get tier color based on collaboration count.
 */
export function getTierColor(count: number): string {
  for (const tier of COLOR_TIERS) {
    if (count >= tier.min && count <= tier.max) {
      return tier.color;
    }
  }
  return COLOR_TIERS[COLOR_TIERS.length - 1].color;
}

/**
 * Compute hop distances from target using BFS.
 */
export function computeHops(targetId: string, connections: { source: string; target: string }[]): Map<string, number> {
  const hops = new Map<string, number>();
  hops.set(targetId, 0);

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const conn of connections) {
    if (!adjacency.has(conn.source)) adjacency.set(conn.source, []);
    if (!adjacency.has(conn.target)) adjacency.set(conn.target, []);
    adjacency.get(conn.source)!.push(conn.target);
    adjacency.get(conn.target)!.push(conn.source);
  }

  // BFS
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentHop = hops.get(current)!;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!hops.has(neighbor)) {
        hops.set(neighbor, currentHop + 1);
        queue.push(neighbor);
      }
    }
  }

  return hops;
}

/**
 * Transform CollaborationData into D3-compatible nodes and links.
 */
export function transformToGraph(data: CollaborationData): {
  nodes: CollaborationNode[];
  links: CollaborationLink[];
} {
  const hops = computeHops(data.target.id, data.connections);

  // Create target node
  const targetNode: CollaborationNode = {
    id: data.target.id,
    name: data.target.name,
    collaborationCount: 0,
    isTarget: true,
    hop: 0
  };

  // Create collaborator nodes
  const collaboratorNodes: CollaborationNode[] = data.collaborators.map(c => ({
    id: c.id,
    name: c.name,
    collaborationCount: c.collaborations.length,
    isTarget: false,
    hop: hops.get(c.id) ?? 99
  }));

  const nodes = [targetNode, ...collaboratorNodes];

  // Create links
  const links: CollaborationLink[] = data.connections.map(c => ({
    source: c.source,
    target: c.target
  }));

  return { nodes, links };
}

/**
 * Get collaboration years for a specific collaborator.
 */
export function getCollaborationYears(collaborator: Collaborator): number[] {
  return collaborator.collaborations.map(c => c.year).sort((a, b) => a - b);
}

/**
 * Get year range from all collaborators.
 */
export function getYearRange(collaborators: Collaborator[]): [number, number] {
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const c of collaborators) {
    for (const collab of c.collaborations) {
      if (collab.year < minYear) minYear = collab.year;
      if (collab.year > maxYear) maxYear = collab.year;
    }
  }

  return [minYear, maxYear];
}

/**
 * Generate demo data with ~30 nodes across 4 hops.
 */
export function generateDemoData(): CollaborationData {
  return {
    target: {
      id: 'target',
      name: 'Dr. Smith'
    },
    collaborators: [
      // Hop 1 - Direct (5 nodes)
      {
        id: 'alice',
        name: 'Alice Chen',
        collaborations: [{ year: 2018 }, { year: 2019 }, { year: 2020 }, { year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'bob',
        name: 'Bob Wilson',
        collaborations: [{ year: 2017 }, { year: 2018 }, { year: 2019 }, { year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'charlie',
        name: 'Charlie Brown',
        collaborations: [{ year: 2019 }, { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }]
      },
      {
        id: 'diana',
        name: 'Diana Ross',
        collaborations: [
          { year: 2016 },
          { year: 2017 },
          { year: 2018 },
          { year: 2019 },
          { year: 2020 },
          { year: 2021 },
          { year: 2022 },
          { year: 2023 },
          { year: 2024 }
        ]
      },
      {
        id: 'eve',
        name: 'Eve Martinez',
        collaborations: [{ year: 2023 }, { year: 2024 }]
      },

      // Hop 2 (8 nodes)
      {
        id: 'frank',
        name: 'Frank Liu',
        collaborations: [{ year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }]
      },
      {
        id: 'grace',
        name: 'Grace Kim',
        collaborations: [{ year: 2019 }, { year: 2020 }, { year: 2021 }]
      },
      {
        id: 'henry',
        name: 'Henry Park',
        collaborations: [{ year: 2018 }, { year: 2019 }, { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'iris',
        name: 'Iris Wang',
        collaborations: [{ year: 2021 }, { year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'jack',
        name: 'Jack Thompson',
        collaborations: [
          { year: 2017 },
          { year: 2018 },
          { year: 2019 },
          { year: 2020 },
          { year: 2021 },
          { year: 2022 },
          { year: 2023 },
          { year: 2024 }
        ]
      },
      {
        id: 'kate',
        name: 'Kate Johnson',
        collaborations: [{ year: 2022 }, { year: 2023 }]
      },
      {
        id: 'leo',
        name: 'Leo Garcia',
        collaborations: [{ year: 2019 }, { year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'mia',
        name: 'Mia Anderson',
        collaborations: [{ year: 2020 }, { year: 2021 }, { year: 2022 }]
      },

      // Hop 3 (10 nodes)
      {
        id: 'noah',
        name: 'Noah Davis',
        collaborations: [{ year: 2021 }, { year: 2022 }, { year: 2023 }]
      },
      {
        id: 'olivia',
        name: 'Olivia Taylor',
        collaborations: [{ year: 2018 }, { year: 2019 }, { year: 2020 }, { year: 2021 }, { year: 2022 }]
      },
      {
        id: 'peter',
        name: 'Peter Moore',
        collaborations: [{ year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'quinn',
        name: 'Quinn Lee',
        collaborations: [{ year: 2019 }, { year: 2020 }]
      },
      {
        id: 'rachel',
        name: 'Rachel White',
        collaborations: [{ year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }, { year: 2024 }]
      },
      {
        id: 'sam',
        name: 'Sam Harris',
        collaborations: [{ year: 2017 }, { year: 2018 }, { year: 2019 }, { year: 2020 }]
      },
      {
        id: 'tina',
        name: 'Tina Clark',
        collaborations: [{ year: 2021 }, { year: 2022 }]
      },
      {
        id: 'uma',
        name: 'Uma Patel',
        collaborations: [{ year: 2023 }, { year: 2024 }]
      },
      {
        id: 'victor',
        name: 'Victor Young',
        collaborations: [{ year: 2018 }, { year: 2019 }, { year: 2020 }, { year: 2021 }]
      },
      {
        id: 'wendy',
        name: 'Wendy Scott',
        collaborations: [{ year: 2022 }, { year: 2023 }, { year: 2024 }]
      },

      // Hop 4 (7 nodes)
      {
        id: 'xavier',
        name: 'Xavier Adams',
        collaborations: [{ year: 2021 }, { year: 2022 }]
      },
      {
        id: 'yolanda',
        name: 'Yolanda King',
        collaborations: [{ year: 2023 }, { year: 2024 }]
      },
      {
        id: 'zack',
        name: 'Zack Miller',
        collaborations: [{ year: 2019 }, { year: 2020 }, { year: 2021 }]
      },
      {
        id: 'anna',
        name: 'Anna Wright',
        collaborations: [{ year: 2022 }]
      },
      {
        id: 'brian',
        name: 'Brian Hall',
        collaborations: [{ year: 2020 }, { year: 2021 }, { year: 2022 }, { year: 2023 }]
      },
      {
        id: 'carla',
        name: 'Carla Green',
        collaborations: [{ year: 2023 }, { year: 2024 }]
      },
      {
        id: 'david',
        name: 'David Baker',
        collaborations: [{ year: 2018 }, { year: 2019 }, { year: 2020 }, { year: 2021 }, { year: 2022 }]
      }
    ],
    connections: [
      // Hop 1: Target to direct collaborators
      { source: 'target', target: 'alice' },
      { source: 'target', target: 'bob' },
      { source: 'target', target: 'charlie' },
      { source: 'target', target: 'diana' },
      { source: 'target', target: 'eve' },

      // Hop 2: Direct collaborators to their connections
      { source: 'alice', target: 'frank' },
      { source: 'alice', target: 'grace' },
      { source: 'bob', target: 'henry' },
      { source: 'bob', target: 'iris' },
      { source: 'charlie', target: 'jack' },
      { source: 'charlie', target: 'kate' },
      { source: 'diana', target: 'leo' },
      { source: 'eve', target: 'mia' },

      // Hop 3: Hop 2 to their connections
      { source: 'frank', target: 'noah' },
      { source: 'frank', target: 'olivia' },
      { source: 'grace', target: 'peter' },
      { source: 'henry', target: 'quinn' },
      { source: 'henry', target: 'rachel' },
      { source: 'iris', target: 'sam' },
      { source: 'jack', target: 'tina' },
      { source: 'kate', target: 'uma' },
      { source: 'leo', target: 'victor' },
      { source: 'mia', target: 'wendy' },

      // Hop 4: Hop 3 to their connections
      { source: 'noah', target: 'xavier' },
      { source: 'olivia', target: 'yolanda' },
      { source: 'peter', target: 'zack' },
      { source: 'quinn', target: 'anna' },
      { source: 'rachel', target: 'brian' },
      { source: 'sam', target: 'carla' },
      { source: 'victor', target: 'david' }
    ]
  };
}
