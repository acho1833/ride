/**
 * @jest-environment node
 */

import { remapJHAffiliation, constructEgoNetworks, constructAuthorNetwork, type EntityRow } from './author-network.utils';
import type { RelationRow } from './csv.utils';

describe('remapJHAffiliation', () => {
  it('maps Berkeley to University of California, Berkeley, USA', () => {
    expect(remapJHAffiliation('UC Berkeley')).toBe('University of California, Berkeley, USA');
  });

  it('maps PARC affiliations', () => {
    expect(remapJHAffiliation('Palo Alto Research Center')).toBe('Palo Alto Research Center, USA');
    expect(remapJHAffiliation('Xerox PARC')).toBe('Palo Alto Research Center, USA');
  });

  it('maps Stanford', () => {
    expect(remapJHAffiliation('Stanford University')).toBe('Stanford University, USA');
  });

  it('maps Washington', () => {
    expect(remapJHAffiliation('University of Washington')).toBe('University of Washington, USA');
  });

  it('defaults to University of Washington for null/undefined', () => {
    expect(remapJHAffiliation(null)).toBe('University of Washington, USA');
    expect(remapJHAffiliation(undefined)).toBe('University of Washington, USA');
    expect(remapJHAffiliation('')).toBe('University of Washington, USA');
  });

  it('returns unrecognized affiliations as-is', () => {
    expect(remapJHAffiliation('MIT')).toBe('MIT');
  });
});

describe('constructEgoNetworks', () => {
  // Chain: ego -> a (hop1) -> b (hop2) -> c (hop3) -> d (hop4)
  const chainData: RelationRow[] = [
    { year: '2020', sourceId: 'ego', targetId: 'a', id: 'p1', type: 'Co-co-author' },
    { year: '2020', sourceId: 'a', targetId: 'b', id: 'p2', type: 'Co-co-author' },
    { year: '2020', sourceId: 'b', targetId: 'c', id: 'p3', type: 'Co-co-author' },
    { year: '2020', sourceId: 'c', targetId: 'd', id: 'p4', type: 'Co-co-author' }
  ];

  it('returns only relations within 2 hops of ego per time slice', () => {
    const { relations: result } = constructEgoNetworks(chainData, 'ego');

    const ids = result.map(r => r.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).not.toContain('p3');
  });

  it('with hopLimit=3, discovers hop-3 entities and their relations', () => {
    const { relations, hopDistances } = constructEgoNetworks(chainData, 'ego', 3);

    // Should include relations up to hop 3
    const ids = relations.map(r => r.id);
    expect(ids).toContain('p1'); // ego -> a
    expect(ids).toContain('p2'); // a -> b
    expect(ids).toContain('p3'); // b -> c (hop 3)
    expect(ids).not.toContain('p4'); // c -> d (hop 4, excluded)

    // Hop distances should be correct
    const dist = hopDistances['2020'];
    expect(dist.get('ego')).toBe(0);
    expect(dist.get('a')).toBe(1);
    expect(dist.get('b')).toBe(2);
    expect(dist.get('c')).toBe(3);
    expect(dist.has('d')).toBe(false); // beyond hop limit
  });

  it('with hopLimit=4, includes up to hop-4 and tracks distances correctly', () => {
    const { relations, hopDistances } = constructEgoNetworks(chainData, 'ego', 4);

    const ids = relations.map(r => r.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).toContain('p3');
    expect(ids).toContain('p4');

    const dist = hopDistances['2020'];
    expect(dist.get('ego')).toBe(0);
    expect(dist.get('a')).toBe(1);
    expect(dist.get('b')).toBe(2);
    expect(dist.get('c')).toBe(3);
    expect(dist.get('d')).toBe(4);
  });
});

describe('constructAuthorNetwork', () => {
  // Chain: ego -> h1 (hop1) -> h2 (hop2) -> h3 (hop3)
  const relations: RelationRow[] = [
    { year: '2020', sourceId: 'ego', targetId: 'h1', id: 'p1', type: 'Co-co-author' },
    { year: '2020', sourceId: 'h1', targetId: 'h2', id: 'p2', type: 'Co-co-author' },
    { year: '2020', sourceId: 'h2', targetId: 'h3', id: 'p3', type: 'Co-co-author' }
  ];

  const allEntities: EntityRow[] = [
    { id: 'ego', year: '2020', name: 'Ego', relationshipcount: 10, affiliation: 'University of Washington' },
    { id: 'h1', year: '2020', name: 'Hop1', relationshipcount: 5, affiliation: 'University of Washington' },
    { id: 'h2', year: '2020', name: 'Hop2', relationshipcount: 3, affiliation: 'MIT' },
    { id: 'h3', year: '2020', name: 'Hop3', relationshipcount: 1, affiliation: 'Stanford' }
  ];

  it('with hopLimit=2, does NOT include hop-3 entity in topology or groups', () => {
    const result = constructAuthorNetwork('ego', relations, allEntities, 2);

    // Topology should not include the h2->h3 relation
    const topoIds = result.topology.map(t => `${t.sourceId}->${t.targetId}`);
    expect(topoIds).not.toContain('h2->h3');

    // Groups should not contain h3
    const allGroupEntities = Object.values(result.groups).flatMap(g => g.flat());
    expect(allGroupEntities).not.toContain('h3');
  });

  it('with hopLimit=3, includes hop-3 entity in topology AND groups', () => {
    const result = constructAuthorNetwork('ego', relations, allEntities, 3);

    // Topology MUST include the h2->h3 relation
    const topoIds = result.topology.map(t => `${t.sourceId}->${t.targetId}`);
    expect(topoIds).toContain('h2->h3');

    // Groups MUST contain h3
    const allGroupEntities = Object.values(result.groups).flatMap(g => g.flat());
    expect(allGroupEntities).toContain('h3');

    // h3 should be in a hop-3 group slot (index 0 or 6 for hopLimit=3)
    const groups2020 = result.groups['2020'];
    expect(groups2020).toBeDefined();
    expect(groups2020.length).toBe(7); // 2*3+1 = 7 groups
    // egoIdx = 3, h3 is external (different affiliation), so group[0] (ext hop-3)
    const egoIdx = 3;
    const externalHop3 = groups2020[egoIdx - 3]; // groups[0]
    const internalHop3 = groups2020[egoIdx + 3]; // groups[6]
    expect([...externalHop3, ...internalHop3]).toContain('h3');
  });
});
