/** Mock entity types */
export const MOCK_ENTITY_TYPES = ['Person', 'Organization', 'Vehicle', 'Location', 'Phone', 'Email', 'Document', 'Account'] as const;

/** Relationship predicates for generating mock relationships */
export const RELATIONSHIP_PREDICATES = [
  'works_for',
  'knows',
  'manages',
  'reports_to',
  'collaborates_with',
  'part_of',
  'owns',
  'located_at',
  'contacted_via',
  'authored'
] as const;
