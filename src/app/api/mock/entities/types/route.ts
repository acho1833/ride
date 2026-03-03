import { NextResponse } from 'next/server';
import * as mockService from '@/features/entity-search/server/services/entity.mock-service';

/**
 * GET /api/mock/entities/types
 * Simulates external entity types API.
 * Returns string[] of distinct entity types as JSON.
 */
export async function GET() {
  const types = await mockService.getEntityTypes();
  return NextResponse.json(types);
}
