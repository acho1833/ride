import { NextRequest, NextResponse } from 'next/server';
import { toEntity } from '@/models/entity.model';
import * as mockService from '@/features/entity-search/server/services/entity.mock-service';
import { EntitySearchParams } from '@/features/entity-search/types';

/**
 * POST /api/mock/entities/search
 * Simulates external entity search API.
 * Returns Entity[] (with attributes) as JSON.
 */
export async function POST(request: NextRequest) {
  const params = (await request.json()) as EntitySearchParams;
  const mockResponse = await mockService.searchEntities(params);
  return NextResponse.json({
    entities: mockResponse.entities.map(toEntity),
    totalCount: mockResponse.totalCount,
    pageNumber: mockResponse.pageNumber,
    pageSize: mockResponse.pageSize
  });
}
