/**
 * @jest-environment node
 */

// @orpc/server ships as ESM which Jest can't transform — mock it to avoid the parse error
jest.mock('@orpc/server', () => ({
  ORPCError: class ORPCError extends Error {
    code: string;
    constructor(code: string, opts: { message: string; data?: unknown }) {
      super(opts.message);
      this.code = code;
    }
  }
}));

import { searchEntities, getEntityById, getEntityTypes } from './entity.service';

// Mock the shared api-client override
jest.mock('@/lib/http/overrides/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

import { apiClient } from '@/lib/http/overrides/api-client';
const mockClient = apiClient as { get: jest.Mock; post: jest.Mock };

describe('entity.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchEntities()', () => {
    it('posts to /entities/search with params and returns response data', async () => {
      const mockResponse = {
        entities: [{ id: 'e1', labelNormalized: 'Alice', type: 'Person', attributes: { nationality: 'US' } }],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 10
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const params = { name: 'Alice', types: [], sortDirection: 'asc' as const, pageSize: 10, pageNumber: 1 };
      const result = await searchEntities(params);

      expect(mockClient.post).toHaveBeenCalledWith('/entities/search', params);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getEntityTypes()', () => {
    it('gets /entities/types and returns string array', async () => {
      mockClient.get.mockResolvedValue(['Person', 'Organization', 'Vehicle']);

      const result = await getEntityTypes();

      expect(mockClient.get).toHaveBeenCalledWith('/entities/types');
      expect(result).toEqual(['Person', 'Organization', 'Vehicle']);
    });
  });

  describe('getEntityById()', () => {
    it('gets /entities/:id with groupBy param and returns entity', async () => {
      const mockEntity = { id: 'e1', labelNormalized: 'Alice', type: 'Person', attributes: { nationality: 'US' } };
      mockClient.get.mockResolvedValue(mockEntity);

      const result = await getEntityById('e1', 'type');

      expect(mockClient.get).toHaveBeenCalledWith('/entities/e1', { params: { groupBy: 'type' } });
      expect(result).toEqual(mockEntity);
    });

    it('throws ORPCError NOT_FOUND when API returns 404', async () => {
      const error = Object.assign(new Error('Not Found'), { response: { status: 404 } });
      mockClient.get.mockRejectedValue(error);

      await expect(getEntityById('missing-id', 'type')).rejects.toMatchObject({
        code: 'NOT_FOUND'
      });
    });

    it('rethrows non-404 errors', async () => {
      const error = Object.assign(new Error('Server Error'), { response: { status: 500 } });
      mockClient.get.mockRejectedValue(error);

      await expect(getEntityById('e1', 'type')).rejects.toThrow('Server Error');
    });
  });
});
