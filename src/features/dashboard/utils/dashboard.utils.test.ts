import { Entity } from '@/models/entity.model';
import { Relationship } from '@/models/relationship.model';

import {
  computeKpiStats,
  computeEntityTypeDistribution,
  computePredicateDistribution,
  computeTypeMatrix,
  computeTopHubs,
  computeDegreeDistribution,
  computeRelationshipPaths,
  computePredicateByType,
  computeMultiEdgePairs,
  computeAvgDegreeByType,
  computeDiverseEntities,
  computeGraphComponents,
  computePredicateExclusivity,
  computeReciprocalPairs,
  computeIsolatedEntities,
  computeLeafEntities
} from './dashboard.utils';

// ─── Shared Test Fixtures ──────────────────────────────────────────────

const entities: Entity[] = [
  { id: 'e1', labelNormalized: 'Alice', type: 'Person' },
  { id: 'e2', labelNormalized: 'Bob', type: 'Person' },
  { id: 'e3', labelNormalized: 'Acme Corp', type: 'Organization' },
  { id: 'e4', labelNormalized: 'New York', type: 'Location' },
  { id: 'e5', labelNormalized: 'Annual Gala', type: 'Event' } // isolated
];

const relationships: Relationship[] = [
  { relationshipId: 'r1', predicate: 'works_for', sourceEntityId: 'e1', relatedEntityId: 'e3' },
  { relationshipId: 'r2', predicate: 'works_for', sourceEntityId: 'e2', relatedEntityId: 'e3' },
  { relationshipId: 'r3', predicate: 'knows', sourceEntityId: 'e1', relatedEntityId: 'e2' },
  { relationshipId: 'r4', predicate: 'located_in', sourceEntityId: 'e3', relatedEntityId: 'e4' },
  { relationshipId: 'r5', predicate: 'knows', sourceEntityId: 'e2', relatedEntityId: 'e1' }, // reciprocal with r3
  { relationshipId: 'r6', predicate: 'reports_to', sourceEntityId: 'e1', relatedEntityId: 'e3' } // multi-edge with r1
];

// Degrees:
// e1: 4 (r1, r3, r5, r6)
// e2: 3 (r2, r3, r5)
// e3: 4 (r1, r2, r4, r6)
// e4: 1 (r4) - leaf
// e5: 0 - isolated

describe('dashboard.utils', () => {
  // ─── computeKpiStats ────────────────────────────────────────────────

  describe('computeKpiStats', () => {
    it('computes all KPI stats correctly', () => {
      const stats = computeKpiStats(entities, relationships);
      expect(stats.totalEntities).toBe(5);
      expect(stats.totalRelationships).toBe(6);
      expect(stats.uniqueEntityTypes).toBe(4);
      expect(stats.uniquePredicates).toBe(4);
      expect(stats.isolatedCount).toBe(1);
      expect(stats.leafCount).toBe(1);
      // avgDegree = (2 * 6) / 5 = 2.4
      expect(stats.avgDegree).toBeCloseTo(2.4);
      // networkDensity = 6 / (5 * 4 / 2) = 6 / 10 = 0.6
      expect(stats.networkDensity).toBeCloseTo(0.6);
    });

    it('returns zeros for empty inputs', () => {
      const stats = computeKpiStats([], []);
      expect(stats.totalEntities).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.uniqueEntityTypes).toBe(0);
      expect(stats.uniquePredicates).toBe(0);
      expect(stats.networkDensity).toBe(0);
      expect(stats.avgDegree).toBe(0);
      expect(stats.isolatedCount).toBe(0);
      expect(stats.leafCount).toBe(0);
    });

    it('handles single entity with no relationships', () => {
      const stats = computeKpiStats([entities[0]], []);
      expect(stats.totalEntities).toBe(1);
      expect(stats.networkDensity).toBe(0);
      expect(stats.avgDegree).toBe(0);
      expect(stats.isolatedCount).toBe(1);
      expect(stats.leafCount).toBe(0);
    });
  });

  // ─── computeEntityTypeDistribution ──────────────────────────────────

  describe('computeEntityTypeDistribution', () => {
    it('groups by type and sorts descending', () => {
      const dist = computeEntityTypeDistribution(entities);
      expect(dist[0]).toEqual({ label: 'Person', count: 2 });
      // remaining types each have count 1
      const rest = dist.slice(1);
      expect(rest).toHaveLength(3);
      rest.forEach(item => expect(item.count).toBe(1));
    });

    it('returns empty array for empty entities', () => {
      expect(computeEntityTypeDistribution([])).toEqual([]);
    });
  });

  // ─── computePredicateDistribution ──────────────────────────────────

  describe('computePredicateDistribution', () => {
    it('groups by predicate and sorts descending', () => {
      const dist = computePredicateDistribution(relationships);
      // works_for: 2, knows: 2, located_in: 1, reports_to: 1
      expect(dist[0].count).toBe(2);
      expect(dist[1].count).toBe(2);
      expect(dist[2].count).toBe(1);
      expect(dist[3].count).toBe(1);
    });

    it('returns empty array for empty relationships', () => {
      expect(computePredicateDistribution([])).toEqual([]);
    });
  });

  // ─── computeTypeMatrix ─────────────────────────────────────────────

  describe('computeTypeMatrix', () => {
    it('builds correct matrix with sorted types', () => {
      const result = computeTypeMatrix(entities, relationships);
      // Types sorted: Event, Location, Organization, Person
      expect(result.types).toEqual(['Event', 'Location', 'Organization', 'Person']);
    });

    it('populates upper triangle correctly', () => {
      const result = computeTypeMatrix(entities, relationships);
      // Location=1, Organization=2, Person=3
      // Person -> Organization: r1(works_for), r2(works_for), r6(reports_to) = 3
      // indices: Organization=2, Person=3 -> matrix[2][3] = 3
      expect(result.matrix[2][3]).toBe(3);
      // Organization -> Location: r4(located_in) = 1
      // indices: Location=1, Organization=2 -> matrix[1][2] = 1
      expect(result.matrix[1][2]).toBe(1);
      // Person -> Person: r3(knows), r5(knows) = 2
      // indices: Person=3, Person=3 -> matrix[3][3] = 2
      expect(result.matrix[3][3]).toBe(2);
    });

    it('finds strongest and weakest type pairs', () => {
      const result = computeTypeMatrix(entities, relationships);
      expect(result.strongest).toEqual({ typeA: 'Organization', typeB: 'Person', count: 3 });
      expect(result.weakest).toEqual({ typeA: 'Location', typeB: 'Organization', count: 1 });
    });

    it('returns null strongest/weakest for empty relationships', () => {
      const result = computeTypeMatrix(entities, []);
      expect(result.strongest).toBeNull();
      expect(result.weakest).toBeNull();
    });

    it('returns empty for empty entities', () => {
      const result = computeTypeMatrix([], []);
      expect(result.types).toEqual([]);
      expect(result.matrix).toEqual([]);
      expect(result.strongest).toBeNull();
      expect(result.weakest).toBeNull();
    });
  });

  // ─── computeTopHubs ─────────────────────────────────────────────────

  describe('computeTopHubs', () => {
    it('returns top entities by degree', () => {
      const hubs = computeTopHubs(entities, relationships);
      // e1 and e3 both have degree 4
      expect(hubs[0].degree).toBe(4);
      expect(hubs[1].degree).toBe(4);
      // e2 has degree 3
      expect(hubs[2].degree).toBe(3);
    });

    it('includes predicate breakdown for each hub', () => {
      const hubs = computeTopHubs(entities, relationships);
      const aliceHub = hubs.find(h => h.entity.id === 'e1');
      expect(aliceHub).toBeDefined();
      // Alice: works_for(1), knows(2 - r3+r5), reports_to(1) - top 3
      expect(aliceHub!.predicateBreakdown).toHaveLength(3);
      expect(aliceHub!.predicateBreakdown[0].label).toBe('knows');
      expect(aliceHub!.predicateBreakdown[0].count).toBe(2);
    });

    it('respects topN parameter', () => {
      const hubs = computeTopHubs(entities, relationships, 2);
      expect(hubs).toHaveLength(2);
    });

    it('returns empty for empty inputs', () => {
      expect(computeTopHubs([], [])).toEqual([]);
    });
  });

  // ─── computeDegreeDistribution ──────────────────────────────────────

  describe('computeDegreeDistribution', () => {
    it('buckets entities into correct ranges', () => {
      const buckets = computeDegreeDistribution(entities, relationships);
      // e5: degree 0 -> "0 rels" bucket
      expect(buckets.find(b => b.range === '0 rels')!.count).toBe(1);
      // e4: degree 1 -> "1 rel" bucket
      expect(buckets.find(b => b.range === '1 rel')!.count).toBe(1);
      // e2: degree 3 -> "2-3" bucket
      expect(buckets.find(b => b.range === '2-3')!.count).toBe(1);
      // e1, e3: degree 4 -> "4-6" bucket
      expect(buckets.find(b => b.range === '4-6')!.count).toBe(2);
    });

    it('includes all buckets even when count is 0', () => {
      const buckets = computeDegreeDistribution(entities, relationships);
      expect(buckets).toHaveLength(7); // all DEGREE_BUCKETS
      expect(buckets.find(b => b.range === '7-10')!.count).toBe(0);
      expect(buckets.find(b => b.range === '11-15')!.count).toBe(0);
      expect(buckets.find(b => b.range === '16+')!.count).toBe(0);
    });

    it('returns all-zero buckets for empty inputs', () => {
      const buckets = computeDegreeDistribution([], []);
      buckets.forEach(b => expect(b.count).toBe(0));
    });
  });

  // ─── computeRelationshipPaths ───────────────────────────────────────

  describe('computeRelationshipPaths', () => {
    it('returns most common paths sorted by count', () => {
      const paths = computeRelationshipPaths(entities, relationships);
      // Person->works_for->Organization: 2 (r1, r2)
      // Person->knows->Person: 2 (r3, r5)
      expect(paths[0].count).toBe(2);
      expect(paths[1].count).toBe(2);
    });

    it('respects topN parameter', () => {
      const paths = computeRelationshipPaths(entities, relationships, 2);
      expect(paths).toHaveLength(2);
    });

    it('returns empty for empty inputs', () => {
      expect(computeRelationshipPaths([], [])).toEqual([]);
    });
  });

  // ─── computePredicateByType ─────────────────────────────────────────

  describe('computePredicateByType', () => {
    it('lists predicates per entity type sorted alphabetically', () => {
      const result = computePredicateByType(entities, relationships);
      const types = result.map(r => r.type);
      // Should be sorted alphabetically by type
      expect(types).toEqual([...types].sort());
    });

    it('counts predicates correctly for Person type', () => {
      const result = computePredicateByType(entities, relationships);
      const personEntry = result.find(r => r.type === 'Person');
      expect(personEntry).toBeDefined();
      // Person participates in: works_for(2-r1,r2), knows(4-r3,r5 x2 endpoints), reports_to(1-r6)
      // e1: r1(works_for), r3(knows), r5(knows), r6(reports_to)
      // e2: r2(works_for), r3(knows), r5(knows)
      // Total for Person: knows=4, works_for=2, reports_to=1
      expect(personEntry!.predicates[0].label).toBe('knows');
      expect(personEntry!.predicates[0].count).toBe(4);
    });

    it('returns empty for empty inputs', () => {
      expect(computePredicateByType([], [])).toEqual([]);
    });
  });

  // ─── computeMultiEdgePairs ──────────────────────────────────────────

  describe('computeMultiEdgePairs', () => {
    it('finds pairs with multiple predicates', () => {
      const pairs = computeMultiEdgePairs(entities, relationships);
      // e1<->e3: works_for + reports_to
      // e1<->e2: knows (appears twice but same predicate, only 1 distinct)
      expect(pairs).toHaveLength(1);
      expect(pairs[0].predicates).toHaveLength(2);
      expect(pairs[0].predicates).toContain('works_for');
      expect(pairs[0].predicates).toContain('reports_to');
    });

    it('returns empty for empty inputs', () => {
      expect(computeMultiEdgePairs([], [])).toEqual([]);
    });
  });

  // ─── computeAvgDegreeByType ─────────────────────────────────────────

  describe('computeAvgDegreeByType', () => {
    it('computes average degree per type sorted descending', () => {
      const result = computeAvgDegreeByType(entities, relationships);
      // Organization: e3 degree 4, avg=4, count=1
      // Person: e1 degree 4, e2 degree 3, avg=3.5, count=2
      // Location: e4 degree 1, avg=1, count=1
      // Event: e5 degree 0, avg=0, count=1
      expect(result[0]).toEqual({ type: 'Organization', avgDegree: 4, entityCount: 1 });
      expect(result[1]).toEqual({ type: 'Person', avgDegree: 3.5, entityCount: 2 });
      expect(result[2]).toEqual({ type: 'Location', avgDegree: 1, entityCount: 1 });
      expect(result[3]).toEqual({ type: 'Event', avgDegree: 0, entityCount: 1 });
    });

    it('returns empty for empty inputs', () => {
      expect(computeAvgDegreeByType([], [])).toEqual([]);
    });
  });

  // ─── computeDiverseEntities ─────────────────────────────────────────

  describe('computeDiverseEntities', () => {
    it('finds entities connected to most different types', () => {
      const result = computeDiverseEntities(entities, relationships);
      // e1 connects to: Person(e2), Organization(e3) -> 2 types
      // e3 connects to: Person(e1,e2), Location(e4) -> 2 types
      // e2 connects to: Organization(e3), Person(e1) -> 2 types
      // e4 connects to: Organization(e3) -> 1 type
      expect(result[0].typeCount).toBe(2);
    });

    it('respects topN parameter', () => {
      const result = computeDiverseEntities(entities, relationships, 2);
      expect(result).toHaveLength(2);
    });

    it('returns empty for empty inputs', () => {
      expect(computeDiverseEntities([], [])).toEqual([]);
    });
  });

  // ─── computeGraphComponents ─────────────────────────────────────────

  describe('computeGraphComponents', () => {
    it('finds connected components', () => {
      const components = computeGraphComponents(entities, relationships);
      // One main component (e1, e2, e3, e4) and one isolated (e5)
      expect(components).toHaveLength(2);
    });

    it('marks largest component as main', () => {
      const components = computeGraphComponents(entities, relationships);
      const main = components.find(c => c.isMainComponent);
      expect(main).toBeDefined();
      expect(main!.entityCount).toBe(4);
      expect(main!.relCount).toBe(6);
    });

    it('includes isolated entities as separate component', () => {
      const components = computeGraphComponents(entities, relationships);
      const isolated = components.find(c => !c.isMainComponent);
      expect(isolated).toBeDefined();
      expect(isolated!.entityCount).toBe(1);
      expect(isolated!.relCount).toBe(0);
    });

    it('calculates percentages correctly', () => {
      const components = computeGraphComponents(entities, relationships);
      const main = components.find(c => c.isMainComponent)!;
      expect(main.percentage).toBeCloseTo(80); // 4/5 * 100
      const isolated = components.find(c => !c.isMainComponent)!;
      expect(isolated.percentage).toBeCloseTo(20); // 1/5 * 100
    });

    it('returns empty for empty inputs', () => {
      expect(computeGraphComponents([], [])).toEqual([]);
    });
  });

  // ─── computePredicateExclusivity ────────────────────────────────────

  describe('computePredicateExclusivity', () => {
    it('identifies exclusive predicates', () => {
      const result = computePredicateExclusivity(entities, relationships);
      // knows: Person<->Person only -> exclusive
      // located_in: Organization->Location only -> exclusive
      // reports_to: Person->Organization only -> exclusive
      // works_for: Person->Organization only -> exclusive
      // All are exclusive in this dataset
      expect(result.exclusive.length).toBeGreaterThan(0);
    });

    it('sorts by predicate alphabetically', () => {
      const result = computePredicateExclusivity(entities, relationships);
      const exclusivePredicates = result.exclusive.map(e => e.predicate);
      expect(exclusivePredicates).toEqual([...exclusivePredicates].sort());
    });

    it('returns empty arrays for empty inputs', () => {
      const result = computePredicateExclusivity([], []);
      expect(result.exclusive).toEqual([]);
      expect(result.generic).toEqual([]);
    });
  });

  // ─── computeReciprocalPairs ─────────────────────────────────────────

  describe('computeReciprocalPairs', () => {
    it('finds pairs with relationships in both directions', () => {
      const pairs = computeReciprocalPairs(entities, relationships);
      // e1->e2 (r3 knows) and e2->e1 (r5 knows) = reciprocal
      expect(pairs).toHaveLength(1);
      const pair = pairs[0];
      const ids = [pair.entityA.id, pair.entityB.id].sort();
      expect(ids).toEqual(['e1', 'e2']);
      expect(pair.predicates).toContain('knows');
    });

    it('returns empty for empty inputs', () => {
      expect(computeReciprocalPairs([], [])).toEqual([]);
    });
  });

  // ─── computeIsolatedEntities ────────────────────────────────────────

  describe('computeIsolatedEntities', () => {
    it('finds entities with zero connections', () => {
      const isolated = computeIsolatedEntities(entities, relationships);
      expect(isolated).toHaveLength(1);
      expect(isolated[0].labelNormalized).toBe('Annual Gala');
    });

    it('sorts alphabetically by labelNormalized', () => {
      const extraEntities: Entity[] = [...entities, { id: 'e6', labelNormalized: 'Alpha Event', type: 'Event' }];
      const isolated = computeIsolatedEntities(extraEntities, relationships);
      expect(isolated).toHaveLength(2);
      expect(isolated[0].labelNormalized).toBe('Alpha Event');
      expect(isolated[1].labelNormalized).toBe('Annual Gala');
    });

    it('returns empty for empty inputs', () => {
      expect(computeIsolatedEntities([], [])).toEqual([]);
    });
  });

  // ─── computeLeafEntities ────────────────────────────────────────────

  describe('computeLeafEntities', () => {
    it('finds entities with exactly one connection', () => {
      const leaves = computeLeafEntities(entities, relationships);
      expect(leaves).toHaveLength(1);
      expect(leaves[0].entity.labelNormalized).toBe('New York');
    });

    it('includes the relationship and connected entity', () => {
      const leaves = computeLeafEntities(entities, relationships);
      const leaf = leaves[0];
      expect(leaf.relationship.predicate).toBe('located_in');
      expect(leaf.connectedEntity.labelNormalized).toBe('Acme Corp');
    });

    it('returns empty for empty inputs', () => {
      expect(computeLeafEntities([], [])).toEqual([]);
    });
  });
});
