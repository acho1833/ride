import { Entity } from '@/models/entity.model';
import { Relationship } from '@/models/relationship.model';

import {
  DEGREE_BUCKETS,
  TOP_DIVERSE_COUNT,
  TOP_HUBS_COUNT,
  TOP_MULTI_EDGE_COUNT,
  TOP_PATHS_COUNT,
  TOP_PREDICATES_PER_HUB,
  TOP_PREDICATES_PER_TYPE
} from '../const';
import {
  AvgDegreeByType,
  DegreeBucket,
  DistributionItem,
  DiverseEntity,
  GraphComponent,
  HubEntity,
  KpiStats,
  LeafEntity,
  MultiEdgePair,
  PredicateByType,
  PredicateExclusivity,
  ReciprocalPair,
  RelationshipPath,
  TypeMatrix
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────

/** Build a map of entityId -> Entity for O(1) lookups */
function buildEntityMap(entities: Entity[]): Map<string, Entity> {
  const map = new Map<string, Entity>();
  for (const entity of entities) {
    map.set(entity.id, entity);
  }
  return map;
}

/** Compute the degree (number of relationships) for each entity */
function computeDegreeMap(entities: Entity[], relationships: Relationship[]): Map<string, number> {
  const degreeMap = new Map<string, number>();
  for (const entity of entities) {
    degreeMap.set(entity.id, 0);
  }
  for (const rel of relationships) {
    degreeMap.set(rel.sourceEntityId, (degreeMap.get(rel.sourceEntityId) ?? 0) + 1);
    degreeMap.set(rel.relatedEntityId, (degreeMap.get(rel.relatedEntityId) ?? 0) + 1);
  }
  return degreeMap;
}

/** Create a canonical (sorted) pair key from two entity IDs */
function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

// ─── 1. computeKpiStats ───────────────────────────────────────────────

export function computeKpiStats(entities: Entity[], relationships: Relationship[]): KpiStats {
  const n = entities.length;
  const edges = relationships.length;

  const uniqueEntityTypes = new Set(entities.map((e) => e.type)).size;
  const uniquePredicates = new Set(relationships.map((r) => r.predicate)).size;

  const networkDensity = n < 2 ? 0 : edges / ((n * (n - 1)) / 2);
  const avgDegree = n === 0 ? 0 : (2 * edges) / n;

  const degreeMap = computeDegreeMap(entities, relationships);
  let isolatedCount = 0;
  let leafCount = 0;
  for (const degree of degreeMap.values()) {
    if (degree === 0) isolatedCount++;
    if (degree === 1) leafCount++;
  }

  return {
    totalEntities: n,
    totalRelationships: edges,
    uniqueEntityTypes,
    uniquePredicates,
    networkDensity,
    avgDegree,
    isolatedCount,
    leafCount
  };
}

// ─── 2. computeEntityTypeDistribution ─────────────────────────────────

export function computeEntityTypeDistribution(entities: Entity[]): DistributionItem[] {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── 3. computePredicateDistribution ──────────────────────────────────

export function computePredicateDistribution(relationships: Relationship[]): DistributionItem[] {
  const counts = new Map<string, number>();
  for (const rel of relationships) {
    counts.set(rel.predicate, (counts.get(rel.predicate) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── 4. computeTypeMatrix ─────────────────────────────────────────────

export function computeTypeMatrix(entities: Entity[], relationships: Relationship[]): TypeMatrix {
  const types = [...new Set(entities.map((e) => e.type))].sort();
  if (types.length === 0) {
    return { types: [], matrix: [], strongest: null, weakest: null };
  }

  const typeIndex = new Map<string, number>();
  types.forEach((t, i) => typeIndex.set(t, i));

  const entityMap = buildEntityMap(entities);
  const n = types.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (const rel of relationships) {
    const sourceEntity = entityMap.get(rel.sourceEntityId);
    const targetEntity = entityMap.get(rel.relatedEntityId);
    if (!sourceEntity || !targetEntity) continue;

    const si = typeIndex.get(sourceEntity.type)!;
    const ti = typeIndex.get(targetEntity.type)!;
    const i = Math.min(si, ti);
    const j = Math.max(si, ti);
    matrix[i][j]++;
  }

  // Find strongest and weakest
  let strongest: TypeMatrix['strongest'] = null;
  let weakest: TypeMatrix['weakest'] = null;
  let maxCount = 0;
  let minCount = Infinity;

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const count = matrix[i][j];
      if (count > maxCount) {
        maxCount = count;
        strongest = { typeA: types[i], typeB: types[j], count };
      }
      if (count > 0 && count < minCount) {
        minCount = count;
        weakest = { typeA: types[i], typeB: types[j], count };
      }
    }
  }

  return { types, matrix, strongest, weakest };
}

// ─── 5. computeTopHubs ────────────────────────────────────────────────

export function computeTopHubs(
  entities: Entity[],
  relationships: Relationship[],
  topN: number = TOP_HUBS_COUNT
): HubEntity[] {
  if (entities.length === 0) return [];

  const degreeMap = computeDegreeMap(entities, relationships);

  // Sort entities by degree descending, take topN
  const sorted = [...entities].sort((a, b) => (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0));
  const topEntities = sorted.slice(0, topN);

  return topEntities.map((entity) => {
    // Count predicates for this entity's relationships
    const predicateCounts = new Map<string, number>();
    for (const rel of relationships) {
      if (rel.sourceEntityId === entity.id || rel.relatedEntityId === entity.id) {
        predicateCounts.set(rel.predicate, (predicateCounts.get(rel.predicate) ?? 0) + 1);
      }
    }

    const predicateBreakdown: DistributionItem[] = Array.from(predicateCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PREDICATES_PER_HUB);

    return {
      entity,
      degree: degreeMap.get(entity.id) ?? 0,
      predicateBreakdown
    };
  });
}

// ─── 6. computeDegreeDistribution ─────────────────────────────────────

export function computeDegreeDistribution(
  entities: Entity[],
  relationships: Relationship[]
): DegreeBucket[] {
  const degreeMap = computeDegreeMap(entities, relationships);

  return DEGREE_BUCKETS.map((bucket) => {
    let count = 0;
    for (const degree of degreeMap.values()) {
      if (degree >= bucket.min && degree <= bucket.max) {
        count++;
      }
    }
    return {
      range: bucket.range,
      min: bucket.min,
      max: bucket.max,
      count
    };
  });
}

// ─── 7. computeRelationshipPaths ──────────────────────────────────────

export function computeRelationshipPaths(
  entities: Entity[],
  relationships: Relationship[],
  topN: number = TOP_PATHS_COUNT
): RelationshipPath[] {
  if (relationships.length === 0) return [];

  const entityMap = buildEntityMap(entities);
  const pathCounts = new Map<string, { sourceType: string; predicate: string; targetType: string; count: number }>();

  for (const rel of relationships) {
    const source = entityMap.get(rel.sourceEntityId);
    const target = entityMap.get(rel.relatedEntityId);
    if (!source || !target) continue;

    const key = `${source.type}|${rel.predicate}|${target.type}`;
    const existing = pathCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      pathCounts.set(key, {
        sourceType: source.type,
        predicate: rel.predicate,
        targetType: target.type,
        count: 1
      });
    }
  }

  return Array.from(pathCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

// ─── 8. computePredicateByType ────────────────────────────────────────

export function computePredicateByType(
  entities: Entity[],
  relationships: Relationship[]
): PredicateByType[] {
  if (entities.length === 0) return [];

  // Group entities by type
  const typeEntities = new Map<string, Set<string>>();
  for (const entity of entities) {
    if (!typeEntities.has(entity.type)) {
      typeEntities.set(entity.type, new Set());
    }
    typeEntities.get(entity.type)!.add(entity.id);
  }

  const result: PredicateByType[] = [];

  for (const [type, entityIds] of typeEntities) {
    const predicateCounts = new Map<string, number>();

    for (const rel of relationships) {
      if (entityIds.has(rel.sourceEntityId) || entityIds.has(rel.relatedEntityId)) {
        // Count for each entity of this type that participates
        if (entityIds.has(rel.sourceEntityId)) {
          predicateCounts.set(rel.predicate, (predicateCounts.get(rel.predicate) ?? 0) + 1);
        }
        if (entityIds.has(rel.relatedEntityId)) {
          predicateCounts.set(rel.predicate, (predicateCounts.get(rel.predicate) ?? 0) + 1);
        }
      }
    }

    const predicates: DistributionItem[] = Array.from(predicateCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PREDICATES_PER_TYPE);

    if (predicates.length > 0) {
      result.push({ type, predicates });
    }
  }

  return result.sort((a, b) => a.type.localeCompare(b.type));
}

// ─── 9. computeMultiEdgePairs ─────────────────────────────────────────

export function computeMultiEdgePairs(
  entities: Entity[],
  relationships: Relationship[],
  topN: number = TOP_MULTI_EDGE_COUNT
): MultiEdgePair[] {
  if (relationships.length === 0) return [];

  const entityMap = buildEntityMap(entities);
  const pairPredicates = new Map<string, Set<string>>();

  for (const rel of relationships) {
    const key = pairKey(rel.sourceEntityId, rel.relatedEntityId);
    if (!pairPredicates.has(key)) {
      pairPredicates.set(key, new Set());
    }
    pairPredicates.get(key)!.add(rel.predicate);
  }

  const result: MultiEdgePair[] = [];
  for (const [key, predicates] of pairPredicates) {
    if (predicates.size < 2) continue;

    const [idA, idB] = key.split('|');
    const entityA = entityMap.get(idA);
    const entityB = entityMap.get(idB);
    if (!entityA || !entityB) continue;

    result.push({
      entityA,
      entityB,
      predicates: [...predicates].sort()
    });
  }

  return result.sort((a, b) => b.predicates.length - a.predicates.length).slice(0, topN);
}

// ─── 10. computeAvgDegreeByType ───────────────────────────────────────

export function computeAvgDegreeByType(
  entities: Entity[],
  relationships: Relationship[]
): AvgDegreeByType[] {
  if (entities.length === 0) return [];

  const degreeMap = computeDegreeMap(entities, relationships);

  // Group by type
  const typeData = new Map<string, { totalDegree: number; count: number }>();
  for (const entity of entities) {
    const degree = degreeMap.get(entity.id) ?? 0;
    const existing = typeData.get(entity.type);
    if (existing) {
      existing.totalDegree += degree;
      existing.count++;
    } else {
      typeData.set(entity.type, { totalDegree: degree, count: 1 });
    }
  }

  return Array.from(typeData.entries())
    .map(([type, data]) => ({
      type,
      avgDegree: data.totalDegree / data.count,
      entityCount: data.count
    }))
    .sort((a, b) => b.avgDegree - a.avgDegree);
}

// ─── 11. computeDiverseEntities ───────────────────────────────────────

export function computeDiverseEntities(
  entities: Entity[],
  relationships: Relationship[],
  topN: number = TOP_DIVERSE_COUNT
): DiverseEntity[] {
  if (entities.length === 0) return [];

  const entityMap = buildEntityMap(entities);

  // For each entity, collect unique types of connected entities
  const entityTypes = new Map<string, Set<string>>();

  for (const rel of relationships) {
    const source = entityMap.get(rel.sourceEntityId);
    const target = entityMap.get(rel.relatedEntityId);
    if (!source || !target) continue;

    if (!entityTypes.has(source.id)) entityTypes.set(source.id, new Set());
    if (!entityTypes.has(target.id)) entityTypes.set(target.id, new Set());

    entityTypes.get(source.id)!.add(target.type);
    entityTypes.get(target.id)!.add(source.type);
  }

  return Array.from(entityTypes.entries())
    .map(([id, types]) => ({
      entity: entityMap.get(id)!,
      typeCount: types.size,
      types: [...types].sort()
    }))
    .sort((a, b) => b.typeCount - a.typeCount)
    .slice(0, topN);
}

// ─── 12. computeGraphComponents ───────────────────────────────────────

export function computeGraphComponents(
  entities: Entity[],
  relationships: Relationship[]
): GraphComponent[] {
  if (entities.length === 0) return [];

  const totalEntities = entities.length;

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const entity of entities) {
    adjacency.set(entity.id, new Set());
  }
  for (const rel of relationships) {
    adjacency.get(rel.sourceEntityId)?.add(rel.relatedEntityId);
    adjacency.get(rel.relatedEntityId)?.add(rel.sourceEntityId);
  }

  // Find connected entities (degree > 0)
  const connectedIds = new Set<string>();
  for (const entity of entities) {
    if ((adjacency.get(entity.id)?.size ?? 0) > 0) {
      connectedIds.add(entity.id);
    }
  }

  const isolatedCount = totalEntities - connectedIds.size;

  // BFS to find connected components
  const visited = new Set<string>();
  const components: GraphComponent[] = [];
  let componentId = 0;

  for (const entityId of connectedIds) {
    if (visited.has(entityId)) continue;

    // BFS
    const queue = [entityId];
    const componentEntities = new Set<string>();
    visited.add(entityId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      componentEntities.add(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor) && connectedIds.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Count relationships within this component
    let relCount = 0;
    for (const rel of relationships) {
      if (componentEntities.has(rel.sourceEntityId) && componentEntities.has(rel.relatedEntityId)) {
        relCount++;
      }
    }

    components.push({
      id: componentId++,
      entityCount: componentEntities.size,
      relCount,
      percentage: (componentEntities.size / totalEntities) * 100,
      isMainComponent: false
    });
  }

  // Sort by entityCount descending and mark largest as main
  components.sort((a, b) => b.entityCount - a.entityCount);
  if (components.length > 0) {
    components[0].isMainComponent = true;
  }

  // Add isolated entities as a single component
  if (isolatedCount > 0) {
    components.push({
      id: 999,
      entityCount: isolatedCount,
      relCount: 0,
      percentage: (isolatedCount / totalEntities) * 100,
      isMainComponent: false
    });
  }

  return components;
}

// ─── 13. computePredicateExclusivity ──────────────────────────────────

export function computePredicateExclusivity(
  entities: Entity[],
  relationships: Relationship[]
): PredicateExclusivity {
  if (relationships.length === 0) return { exclusive: [], generic: [] };

  const entityMap = buildEntityMap(entities);

  // For each predicate, collect unique (sourceType, targetType) pairs (normalized)
  const predicatePairs = new Map<string, Set<string>>();

  for (const rel of relationships) {
    const source = entityMap.get(rel.sourceEntityId);
    const target = entityMap.get(rel.relatedEntityId);
    if (!source || !target) continue;

    if (!predicatePairs.has(rel.predicate)) {
      predicatePairs.set(rel.predicate, new Set());
    }

    // Normalize: sort types alphabetically
    const [typeA, typeB] = [source.type, target.type].sort();
    predicatePairs.get(rel.predicate)!.add(`${typeA}|${typeB}`);
  }

  const exclusive: PredicateExclusivity['exclusive'] = [];
  const generic: PredicateExclusivity['generic'] = [];

  for (const [predicate, pairs] of predicatePairs) {
    const pairsList = [...pairs].map((p) => {
      const [sourceType, targetType] = p.split('|');
      return { sourceType, targetType };
    });

    if (pairsList.length === 1) {
      exclusive.push({
        predicate,
        sourceType: pairsList[0].sourceType,
        targetType: pairsList[0].targetType
      });
    } else {
      generic.push({ predicate, typePairs: pairsList });
    }
  }

  exclusive.sort((a, b) => a.predicate.localeCompare(b.predicate));
  generic.sort((a, b) => a.predicate.localeCompare(b.predicate));

  return { exclusive, generic };
}

// ─── 14. computeReciprocalPairs ───────────────────────────────────────

export function computeReciprocalPairs(
  entities: Entity[],
  relationships: Relationship[]
): ReciprocalPair[] {
  if (relationships.length === 0) return [];

  const entityMap = buildEntityMap(entities);

  // Build directed edge map: sourceId -> Set of targetIds
  const directedEdges = new Map<string, Set<string>>();
  for (const rel of relationships) {
    if (!directedEdges.has(rel.sourceEntityId)) {
      directedEdges.set(rel.sourceEntityId, new Set());
    }
    directedEdges.get(rel.sourceEntityId)!.add(rel.relatedEntityId);
  }

  // Find reciprocal pairs: A->B and B->A both exist
  const found = new Set<string>();
  const result: ReciprocalPair[] = [];

  for (const rel of relationships) {
    const a = rel.sourceEntityId;
    const b = rel.relatedEntityId;
    const key = pairKey(a, b);

    if (found.has(key)) continue;

    // Check if reverse direction exists
    if (directedEdges.get(b)?.has(a)) {
      found.add(key);

      const entityA = entityMap.get(a < b ? a : b);
      const entityB = entityMap.get(a < b ? b : a);
      if (!entityA || !entityB) continue;

      // Collect all predicates between this pair
      const predicates = new Set<string>();
      for (const r of relationships) {
        if (
          (r.sourceEntityId === a && r.relatedEntityId === b) ||
          (r.sourceEntityId === b && r.relatedEntityId === a)
        ) {
          predicates.add(r.predicate);
        }
      }

      result.push({
        entityA,
        entityB,
        predicates: [...predicates].sort()
      });
    }
  }

  return result.sort((a, b) => b.predicates.length - a.predicates.length);
}

// ─── 15. computeIsolatedEntities ──────────────────────────────────────

export function computeIsolatedEntities(
  entities: Entity[],
  relationships: Relationship[]
): Entity[] {
  const degreeMap = computeDegreeMap(entities, relationships);

  return entities
    .filter((e) => (degreeMap.get(e.id) ?? 0) === 0)
    .sort((a, b) => a.labelNormalized.localeCompare(b.labelNormalized));
}

// ─── 16. computeLeafEntities ──────────────────────────────────────────

export function computeLeafEntities(
  entities: Entity[],
  relationships: Relationship[]
): LeafEntity[] {
  if (entities.length === 0) return [];

  const entityMap = buildEntityMap(entities);
  const degreeMap = computeDegreeMap(entities, relationships);

  const leaves: LeafEntity[] = [];

  for (const entity of entities) {
    if ((degreeMap.get(entity.id) ?? 0) !== 1) continue;

    // Find the single relationship
    const rel = relationships.find(
      (r) => r.sourceEntityId === entity.id || r.relatedEntityId === entity.id
    );
    if (!rel) continue;

    const connectedId =
      rel.sourceEntityId === entity.id ? rel.relatedEntityId : rel.sourceEntityId;
    const connectedEntity = entityMap.get(connectedId);
    if (!connectedEntity) continue;

    leaves.push({
      entity,
      relationship: rel,
      connectedEntity
    });
  }

  return leaves.sort((a, b) => a.entity.labelNormalized.localeCompare(b.entity.labelNormalized));
}
