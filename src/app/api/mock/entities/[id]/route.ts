import { NextRequest, NextResponse } from 'next/server';
import { toEntity } from '@/models/entity.model';
import type { RelatedEntity } from '@/models/entity.model';
import type { RelatedEntityResponse } from '@/models/entity-response.model';
import * as mockService from '@/features/entity-search/server/services/entity.mock-service';

/**
 * GET /api/mock/entities/:id?groupBy=type|predicate
 * Simulates external entity detail API.
 * Returns Entity with grouped relatedEntities as JSON.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const groupBy = (request.nextUrl.searchParams.get('groupBy') as 'type' | 'predicate') ?? 'type';

  const response = await mockService.getEntityById(id);
  if (!response) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  const entity = toEntity(response);

  if (response.relatedEntities && response.relatedEntities.length > 0) {
    const grouped: Record<string, RelatedEntity[]> = {};
    for (const rel of response.relatedEntities) {
      const key = groupBy === 'type' ? rel.entity.type : rel.type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(toRelatedEntity(rel));
    }
    entity.relatedEntities = grouped;
  }

  return NextResponse.json(entity);
}

function toRelatedEntity(rel: RelatedEntityResponse): RelatedEntity {
  return {
    id: rel.entity.id,
    labelNormalized: rel.entity.labelNormalized,
    type: rel.entity.type,
    predicate: rel.type
  };
}
