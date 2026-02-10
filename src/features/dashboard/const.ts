/** Number of top hub entities to display */
export const TOP_HUBS_COUNT = 5;

/** Number of top relationship paths to display */
export const TOP_PATHS_COUNT = 5;

/** Number of top multi-edge pairs to display */
export const TOP_MULTI_EDGE_COUNT = 5;

/** Number of top diverse entities to display */
export const TOP_DIVERSE_COUNT = 5;

/** Number of top predicates shown per hub entity */
export const TOP_PREDICATES_PER_HUB = 3;

/** Number of top predicates shown per entity type */
export const TOP_PREDICATES_PER_TYPE = 5;

/** Maximum number of leaf entities to display */
export const LEAF_DISPLAY_LIMIT = 6;

/** Degree distribution histogram buckets */
export const DEGREE_BUCKETS = [
  { range: '0 rels', min: 0, max: 0 },
  { range: '1 rel', min: 1, max: 1 },
  { range: '2-3', min: 2, max: 3 },
  { range: '4-6', min: 4, max: 6 },
  { range: '7-10', min: 7, max: 10 },
  { range: '11-15', min: 11, max: 15 },
  { range: '16+', min: 16, max: Infinity }
] as const;

/** Tooltip descriptions for each dashboard section */
export const SECTION_TOOLTIPS = {
  entities: 'Total number of entities (nodes) in this workspace',
  relationships: 'Total number of relationships (edges) connecting entities',
  entityTypes: 'Number of distinct entity types (e.g., Person, Organization)',
  predicateTypes: 'Number of distinct relationship types (e.g., works_for, knows)',
  networkDensity:
    'Percentage of possible connections that actually exist. Low density means a sparse graph',
  avgDegree: 'Average number of relationships per entity. Higher means more interconnected',
  isolated: 'Entities with zero connections. May indicate data quality issues',
  leaf: 'Entities with exactly one connection. These are the periphery of the graph',
  entityTypeDistribution:
    'Distribution of entities by type. Shows what this graph is primarily about',
  predicateDistribution:
    'Distribution of relationship types. Shows the dominant kinds of connections',
  typeMatrix:
    'How many relationships exist between each pair of entity types. Reveals the structural backbone of the graph',
  topHubs:
    'Most connected entities — the key nodes in the graph. Shows their top predicates',
  relationshipPaths:
    'Most common type-to-type connection patterns including the predicate. Shows the dominant information flows',
  degreeDistribution:
    'How connections are spread across entities. A long tail means few hubs and many peripheral nodes',
  predicateByType:
    'Which predicates each entity type participates in. Shows the role each type plays in the graph',
  multiEdge:
    'Entity pairs connected by two or more different predicates. These are the strongest relationships',
  avgDegreeByType:
    'Average connections per entity, broken down by type. Shows which types are most interconnected',
  diverseEntities:
    'Entities connected to the most different entity types. These are the bridge nodes spanning domains',
  graphComponents:
    'Disconnected subgraphs within the workspace. Multiple components may indicate fragmented data',
  predicateExclusivity:
    'Whether predicates connect only specific type pairs (exclusive) or multiple type combinations (generic)',
  reciprocalPairs:
    'Entity pairs with relationships in both directions. Indicates strong bidirectional connections',
  isolatedEntities:
    'Entities with no connections at all. Consider whether these should be linked or removed',
  leafEntities:
    'Entities with only one connection. Shown with their single relationship for context'
} as const;
