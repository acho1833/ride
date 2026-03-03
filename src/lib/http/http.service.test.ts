/**
 * @jest-environment node
 */

import axios from 'axios';
import { createHttpService } from './http.service';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('createHttpService', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockInstance as never);
  });

  it('creates an axios instance with the given baseURL and headers', () => {
    createHttpService('http://localhost:3000/api', { 'Content-Type': 'application/json' });

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000/api',
      headers: { 'Content-Type': 'application/json' }
    });
  });

  it('creates an axios instance with empty headers when none provided', () => {
    createHttpService('http://localhost:3000/api');

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000/api',
      headers: {}
    });
  });

  describe('get()', () => {
    it('calls axios instance get and returns response data', async () => {
      const service = createHttpService('http://localhost:3000');
      mockInstance.get.mockResolvedValue({ data: { id: '1', name: 'Test' } });

      const result = await service.get('/items/1');

      expect(mockInstance.get).toHaveBeenCalledWith('/items/1', undefined);
      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('passes config to axios get', async () => {
      const service = createHttpService('http://localhost:3000');
      mockInstance.get.mockResolvedValue({ data: ['Person', 'Organization'] });

      await service.get('/types', { params: { filter: 'active' } });

      expect(mockInstance.get).toHaveBeenCalledWith('/types', { params: { filter: 'active' } });
    });
  });

  describe('post()', () => {
    it('calls axios instance post and returns response data', async () => {
      const service = createHttpService('http://localhost:3000');
      const body = { name: 'Alice', type: 'Person' };
      mockInstance.post.mockResolvedValue({ data: { id: '2', ...body } });

      const result = await service.post('/entities', body);

      expect(mockInstance.post).toHaveBeenCalledWith('/entities', body, undefined);
      expect(result).toEqual({ id: '2', name: 'Alice', type: 'Person' });
    });

    it('passes config to axios post', async () => {
      const service = createHttpService('http://localhost:3000');
      mockInstance.post.mockResolvedValue({ data: {} });

      await service.post('/search', { name: 'alice' }, { params: { debug: true } });

      expect(mockInstance.post).toHaveBeenCalledWith('/search', { name: 'alice' }, { params: { debug: true } });
    });
  });
});
