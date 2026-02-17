# Spreadline Entity IDs Design

## Problem

The current CSV files in `data/spreadline/vis-author/` identify people by name only. If two different people share the same name, they can't be differentiated. We need dedicated person IDs.

## CSV Changes (`data/spreadline/vis-author2/`)

Keep `vis-author/` as reference. Create new `vis-author2/` with ID-based CSVs.

### entities.csv

Add `id` column. Each unique person name gets a stable ID (`p001`, `p002`, ...).

```
id,name,year,citationcount,affiliation
p001,Ben Shneiderman,1971,11,"State University of New York at Farmingdale..."
p001,Ben Shneiderman,1974,24,...
p002,Jeffrey Heer,2005,1030,University of California at Berkeley
```

### relations.csv

Replace `source`/`target` (names) with `sourceId`/`targetId` (person IDs).

```
year,sourceId,targetId,id,type,citationcount,count
1974,p001,p003,53e9981db7602d970203d5ca,Co-co-author,24.0,1
```

### citations.csv

Replace `name` with `entityId` (person ID).

```
entityId,year,citationcount,affiliation,paperID
p001,1971,11,"State University of New York...",00
```

Paper `id` in relations and `paperID` in citations stay unchanged.

## API Response Changes

### New Response Shape

```typescript
interface SpreadlineRawDataResponse {
  egoId: string;
  dataset: string;
  entities: Record<string, {
    name: string;
    category: 'internal' | 'external';
    citations: Record<string, number>;  // time -> citationCount
  }>;
  topology: { sourceId: string; targetId: string; time: string; weight: number }[];
  groups: Record<string, string[][]>;  // year -> 5-layer positional arrays of IDs
  config: {
    timeDelta: string;
    timeFormat: string;
    squeezeSameCategory: boolean;
    minimize: string;
  };
}
```

### Changes from current response

- `ego` -> `egoId` (now an entity ID)
- `topology.source` -> `topology.sourceId`
- `topology.target` -> `topology.targetId`
- `lineCategory` removed — merged into `entities[id].category`
- `nodeContext` removed — merged into `entities[id].citations`
- NEW: `entities` map with `{ name, category, citations }` per entity

### Ego input

Stays as a name string for ergonomics. Service resolves name -> ID internally.

## Files to Change

### New files

- `data/spreadline/vis-author2/entities.csv`
- `data/spreadline/vis-author2/relations.csv`
- `data/spreadline/vis-author2/citations.csv`
- One-time generation script to create above from `vis-author/`

### Modified files

1. `src/features/spreadlines/server/services/spreadline-data.service.ts`
   - `DATA_DIR` -> `vis-author2`
   - Update `RelationRow`, `EntityRow`, `CitationRow` interfaces
   - Build `entities` map (id -> { name, category, citations })
   - Internal logic matches by ID instead of name
   - Response shape updated

2. `src/features/spreadlines/server/routers.ts`
   - Update Zod output schema

3. `src/features/spreadlines/components/spreadline.component.tsx`
   - Use `entities[id].category` for colors
   - Convert `entities[id].citations` to nodeContext format for SpreadLine library
   - Use `egoId` and resolve name from entities map

4. `src/features/spreadlines/server/services/spreadline-data.service.test.ts`
   - Update assertions for new response shape
   - Verify entity map structure, IDs in topology, citations nested in entities
