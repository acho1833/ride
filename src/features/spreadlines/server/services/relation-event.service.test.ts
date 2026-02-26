/**
 * @jest-environment node
 */

jest.mock('@orpc/server', () => ({
  ORPCError: class ORPCError extends Error {
    constructor(code: string, opts?: { message?: string }) {
      super(opts?.message ?? code);
    }
  }
}));

import { getRelationEvents } from './relation-event.service';

describe('relation-event.service', () => {
  it('returns relation events between two entities', async () => {
    const events = await getRelationEvents('p0227', 'p0901');

    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(typeof event.id).toBe('string');
      expect(typeof event.year).toBe('string');
      expect(typeof event.type).toBe('string');
      expect(typeof event.citationCount).toBe('number');
    }
  });

  it('includes sourceId and targetId in each event', async () => {
    const events = await getRelationEvents('p0227', 'p0901');

    for (const event of events) {
      expect(event.sourceId).toBe('p0227');
      expect(event.targetId).toBe('p0901');
    }
  });

  it('returns events sorted by year descending', async () => {
    const events = await getRelationEvents('p0227', 'p0901');

    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].year >= events[i].year).toBe(true);
    }
  });

  it('returns empty array for non-existent entity pair', async () => {
    const events = await getRelationEvents('nonexistent1', 'nonexistent2');
    expect(events).toEqual([]);
  });

  it('caps results at MAX_RELATION_EVENTS', async () => {
    // p0227 + p0901 has many synthetic rows in the monthly dataset
    const events = await getRelationEvents('p0227', 'p0901');

    // The service caps at MAX_RELATION_EVENTS (500)
    expect(events.length).toBeLessThanOrEqual(500);
    expect(events.length).toBeGreaterThan(0);
  });
});
