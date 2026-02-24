# Relationship Evidence (.re) Tab — Design Document

**Date:** 2026-02-24

## Overview

When a user double-clicks a link (edge) in the spreadline graph, a new virtual tab opens with `.re` extension showing all relationship events between the two connected authors. Events are displayed in a Shadcn Table powered by TanStack React Table v8 with per-column filtering and client-side pagination. Max 500 events.

## Data Model

### RelationEvent

```typescript
// src/models/relation-event.model.ts
export interface RelationEvent {
  id: string;            // paper/publication ID
  year: string;          // monthly format "YYYY-MM"
  sourceId: string;      // author ID
  targetId: string;      // author ID
  type: string;          // e.g. "Co-co-author"
  citationCount: number; // citation count for this event
}
```

## API Endpoint

**Route:** `GET /spreadlines/relation-events`
**Input:** `{ sourceId: string, targetId: string }`
**Output:** `RelationEvent[]` (max 500, descending by year)

Server reads the relations CSV, filters for rows where the (sourceId, targetId) pair matches in either direction, caps at 500, returns sorted descending by year.

## Tab Opening Flow

1. User double-clicks a link `<line>` in `spreadline-graph.component.tsx`
2. Extract `source.id`, `target.id`, source/target names, and current time range
3. Call `openNewFile({
     id: 're-${sourceId}-${targetId}',
     name: '${sourceLastName} ↔ ${targetLastName}.re',
     metadata: { sourceId, targetId, sourceName, targetName, timeStart, timeEnd }
   })`
4. `editor-content.component.tsx` routes `.re` extension to `RelationshipEvidenceComponent`
5. Component uses `useRelationEventsQuery(sourceId, targetId)` to fetch data
6. Year column filter is pre-populated with `timeStart`/`timeEnd` from metadata

## UI Design

### RelationshipEvidenceComponent

- **Header:** Full author names (e.g. "John Smith ↔ Jane Jones") + total event count
- **Table** (Shadcn Table + TanStack React Table v8):
  - Columns: Year, Paper ID, Type, Citation Count
  - Per-column filters in header row:
    - Year: Min/Max inputs (YYYY-MM format), pre-populated from spreadline time range
    - Paper ID: text search
    - Type: text search
    - Citation Count: text search
  - Default sort: Year descending
  - Client-side pagination: 25 rows per page
- **States:** Loading skeleton, empty message, error message

## File Structure

### New files

```
src/models/relation-event.model.ts
src/features/spreadlines/server/services/relation-event.service.ts
src/features/spreadlines/hooks/useRelationEventsQuery.ts
src/features/relationship-evidence/
├── components/
│   └── relationship-evidence.component.tsx
├── const.ts
└── utils.ts
```

### Modified files

```
src/features/spreadlines/server/routers.ts          # Add relation-events endpoint
src/features/spreadlines/components/spreadline-graph.component.tsx  # Add dblclick on links
src/features/editor/components/editor-content.component.tsx         # Add 're' case
src/features/editor/components/editor-group.component.tsx           # Scroll behavior for .re
package.json                                        # Add @tanstack/react-table
```

### Shadcn components to install

```
npx shadcn@latest add table
```

## Constants

```typescript
// src/features/relationship-evidence/const.ts
export const MAX_RELATION_EVENTS = 500;
export const PAGE_SIZE = 25;
```

## Decisions

- **Client-side filtering and paging** for demo; may move to server-side later
- **Monthly format** (YYYY-MM) for year values
- **Last names only** in tab title to keep it short
- **New API endpoint** rather than passing data via store
- **Bidirectional matching** — endpoint matches (A,B) and (B,A) in CSV
