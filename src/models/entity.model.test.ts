/**
 * @jest-environment node
 */

import { toEntity } from './entity.model';

describe('entity.model', () => {
  describe('toEntity', () => {
    it('maps base fields correctly', () => {
      const result = toEntity({ id: 'e1', labelNormalized: 'Alice', type: 'Person' });

      expect(result.id).toBe('e1');
      expect(result.labelNormalized).toBe('Alice');
      expect(result.type).toBe('Person');
    });

    it('maps attributes when present', () => {
      const result = toEntity({
        id: 'e1',
        labelNormalized: 'Alice',
        type: 'Person',
        attributes: { dateOfBirth: '1985-03-12', nationality: 'US' }
      });

      expect(result.attributes).toEqual({ dateOfBirth: '1985-03-12', nationality: 'US' });
    });

    it('omits attributes when not present in response', () => {
      const result = toEntity({ id: 'e1', labelNormalized: 'Alice', type: 'Person' });

      expect(result.attributes).toBeUndefined();
    });

    it('omits attributes when response attributes is undefined', () => {
      const result = toEntity({ id: 'e1', labelNormalized: 'Alice', type: 'Person', attributes: undefined });

      expect(result.attributes).toBeUndefined();
    });
  });
});
