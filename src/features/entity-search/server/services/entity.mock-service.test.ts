/**
 * @jest-environment node
 */

import { searchEntities, getEntityById, getEntityTypes } from './entity.mock-service';

describe('entity.mock-service', () => {
  describe('searchEntities', () => {
    it('returns entities when no name filter', async () => {
      const result = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'asc',
        pageSize: 10,
        pageNumber: 1
      });

      expect(result.entities.length).toBe(10);
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.pageNumber).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('filters by name (contains match)', async () => {
      const result = await searchEntities({
        name: 'Google',
        types: [],
        sortDirection: 'asc',
        pageSize: 100,
        pageNumber: 1
      });

      expect(result.totalCount).toBeGreaterThan(0);
      for (const entity of result.entities) {
        expect(entity.labelNormalized.toLowerCase()).toContain('google');
      }
    });

    it('filters by name with wildcard prefix match', async () => {
      const result = await searchEntities({
        name: 'A*',
        types: [],
        sortDirection: 'asc',
        pageSize: 100,
        pageNumber: 1
      });

      expect(result.totalCount).toBeGreaterThan(0);
      for (const entity of result.entities) {
        expect(entity.labelNormalized.toLowerCase().startsWith('a')).toBe(true);
      }
    });

    it('filters by types', async () => {
      const result = await searchEntities({
        name: '',
        types: ['Organization'],
        sortDirection: 'asc',
        pageSize: 100,
        pageNumber: 1
      });

      expect(result.totalCount).toBeGreaterThan(0);
      for (const entity of result.entities) {
        expect(entity.type).toBe('Organization');
      }
    });

    it('sorts ascending', async () => {
      const result = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'asc',
        pageSize: 20,
        pageNumber: 1
      });

      for (let i = 1; i < result.entities.length; i++) {
        const a = result.entities[i - 1].labelNormalized.toLowerCase();
        const b = result.entities[i].labelNormalized.toLowerCase();
        expect(a.localeCompare(b)).toBeLessThanOrEqual(0);
      }
    });

    it('sorts descending', async () => {
      const result = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'desc',
        pageSize: 20,
        pageNumber: 1
      });

      for (let i = 1; i < result.entities.length; i++) {
        const a = result.entities[i - 1].labelNormalized.toLowerCase();
        const b = result.entities[i].labelNormalized.toLowerCase();
        expect(a.localeCompare(b)).toBeGreaterThanOrEqual(0);
      }
    });

    it('paginates correctly', async () => {
      const page1 = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'asc',
        pageSize: 5,
        pageNumber: 1
      });

      const page2 = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'asc',
        pageSize: 5,
        pageNumber: 2
      });

      expect(page1.entities.length).toBe(5);
      expect(page2.entities.length).toBe(5);
      // Pages should have different entities
      const page1Ids = page1.entities.map(e => e.id);
      const page2Ids = page2.entities.map(e => e.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('returns correct totalCount regardless of page', async () => {
      const page1 = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'asc',
        pageSize: 5,
        pageNumber: 1
      });

      const page2 = await searchEntities({
        name: '',
        types: [],
        sortDirection: 'asc',
        pageSize: 5,
        pageNumber: 2
      });

      expect(page1.totalCount).toBe(page2.totalCount);
    });
  });

  describe('getEntityById', () => {
    it('returns entity with related entities for known ID', async () => {
      const result = await getEntityById('google-hq');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('google-hq');
      expect(result!.labelNormalized).toBe('Google');
      expect(result!.type).toBe('Organization');
      expect(result!.relatedEntities).toBeDefined();
      expect(result!.relatedEntities!.length).toBeGreaterThan(0);
    });

    it('returns null for non-existent ID', async () => {
      const result = await getEntityById('does-not-exist-xyz');

      expect(result).toBeNull();
    });

    it('returns related entities with correct structure', async () => {
      const result = await getEntityById('google-hq');

      expect(result).not.toBeNull();
      for (const rel of result!.relatedEntities!) {
        expect(rel).toHaveProperty('type');
        expect(rel).toHaveProperty('entity');
        expect(rel.entity).toHaveProperty('id');
        expect(rel.entity).toHaveProperty('labelNormalized');
        expect(rel.entity).toHaveProperty('type');
      }
    });
  });

  describe('getEntityTypes', () => {
    it('returns distinct entity types', async () => {
      const types = await getEntityTypes();

      expect(types).toContain('Person');
      expect(types).toContain('Organization');
      expect(types.length).toBe(2);
    });
  });
});
