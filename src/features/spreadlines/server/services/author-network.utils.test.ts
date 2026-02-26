/**
 * @jest-environment node
 */

import { remapJHAffiliation, constructEgoNetworks } from './author-network.utils';

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
  it('returns only relations within 2 hops of ego per time slice', () => {
    const data = [
      { year: '2020', sourceId: 'ego', targetId: 'a', id: 'p1', type: 'Co-co-author' },
      { year: '2020', sourceId: 'a', targetId: 'b', id: 'p2', type: 'Co-co-author' },
      { year: '2020', sourceId: 'b', targetId: 'c', id: 'p3', type: 'Co-co-author' }
    ];
    const result = constructEgoNetworks(data, 'ego');

    const ids = result.map(r => r.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).not.toContain('p3');
  });
});
