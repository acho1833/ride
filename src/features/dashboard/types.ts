import { Entity } from '@/models/entity.model';
import { Relationship } from '@/models/relationship.model';

/** Key performance indicator stats for the workspace graph */
export interface KpiStats {
  totalEntities: number;
  totalRelationships: number;
  uniqueEntityTypes: number;
  uniquePredicates: number;
  networkDensity: number;
  avgDegree: number;
  isolatedCount: number;
  leafCount: number;
}

/** A label/count pair used for distribution charts */
export interface DistributionItem {
  label: string;
  count: number;
}

/** Cross-type relationship matrix showing connections between entity types */
export interface TypeMatrix {
  types: string[];
  matrix: number[][];
  strongest: { typeA: string; typeB: string; count: number } | null;
  weakest: { typeA: string; typeB: string; count: number } | null;
}

/** A highly-connected entity with its degree and top predicates */
export interface HubEntity {
  entity: Entity;
  degree: number;
  predicateBreakdown: DistributionItem[];
}

/** A common source-type -> predicate -> target-type path */
export interface RelationshipPath {
  sourceType: string;
  predicate: string;
  targetType: string;
  count: number;
}

/** A bucket in the degree distribution histogram */
export interface DegreeBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

/** Predicate breakdown for a single entity type */
export interface PredicateByType {
  type: string;
  predicates: DistributionItem[];
}

/** An entity pair connected by multiple different predicates */
export interface MultiEdgePair {
  entityA: Entity;
  entityB: Entity;
  predicates: string[];
}

/** Average degree stats for a single entity type */
export interface AvgDegreeByType {
  type: string;
  avgDegree: number;
  entityCount: number;
}

/** An entity connected to many different entity types */
export interface DiverseEntity {
  entity: Entity;
  typeCount: number;
  types: string[];
}

/** A disconnected subgraph (connected component) within the workspace */
export interface GraphComponent {
  id: number;
  entityCount: number;
  relCount: number;
  percentage: number;
  isMainComponent: boolean;
}

/** Predicate exclusivity analysis - exclusive vs generic predicates */
export interface PredicateExclusivity {
  exclusive: { predicate: string; sourceType: string; targetType: string }[];
  generic: { predicate: string; typePairs: { sourceType: string; targetType: string }[] }[];
}

/** An entity pair with relationships in both directions */
export interface ReciprocalPair {
  entityA: Entity;
  entityB: Entity;
  predicates: string[];
}

/** An entity with exactly one connection, shown with its single relationship */
export interface LeafEntity {
  entity: Entity;
  relationship: Relationship;
  connectedEntity: Entity;
}
