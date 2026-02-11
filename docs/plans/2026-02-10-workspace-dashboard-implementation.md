# Workspace Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dashboard analytics view for workspace `.ws` files, opened via toolbar button into the bottom panel tab system.

**Architecture:** Dashboard button on workspace toolbar opens a new DASHBOARD tab in the bottom panel. The dashboard component fetches workspace data via existing `useWorkspaceQuery` hook, computes all analytics client-side with pure functions in `dashboard.utils.ts`, and renders 14 panels in a 2-column scrollable grid using Shadcn Card + Tooltip + pure CSS bars.

**Tech Stack:** React, TypeScript, Zustand (existing type-tabs store), TanStack Query (existing workspace query), Shadcn Card/Tooltip/Badge, Tailwind CSS, Vitest (tests)

---

## Task 1: Add DASHBOARD to ChartType and DashboardData interface

**Files:**
- Modify: `src/stores/type-tabs/type-tabs.store.ts:14` (ChartType union)
- Modify: `src/stores/type-tabs/type-tabs.store.ts:30` (after SpreadlineData)

**Step 1: Add DASHBOARD to ChartType union**

In `src/stores/type-tabs/type-tabs.store.ts`, line 14, change:
```typescript
export type ChartType = 'SPREADLINE' | 'BAR' | 'LINE' | 'PIE';
```
to:
```typescript
export type ChartType = 'SPREADLINE' | 'BAR' | 'LINE' | 'PIE' | 'DASHBOARD';
```

**Step 2: Add DashboardData interface**

After `SpreadlineData` (line 30), add:
```typescript
/** Dashboard-specific data - references a workspace by ID */
export interface DashboardData {
  workspaceId: string;
  workspaceName: string;
}
```

**Step 3: Verify build**

Run: `npm run lint`
Expected: PASS (no errors)

**Step 4: Commit**

```bash
git add src/stores/type-tabs/type-tabs.store.ts
git commit -m "feat(dashboard): add DASHBOARD chart type and DashboardData interface"
```

---

## Task 2: Create dashboard types and constants

**Files:**
- Create: `src/features/dashboard/types.ts`
- Create: `src/features/dashboard/const.ts`

**Step 1: Create types.ts**

Create `src/features/dashboard/types.ts`:
```typescript
import type { Entity } from '@/models/entity.model';
import type { Relationship } from '@/models/relationship.model';

/** KPI summary statistics */
export interface KpiStats {
  totalEntities: number;
  totalRelationships: number;
  uniqueEntityTypes: number;
  uniquePredicates: number;
  networkDensity: number;
  avgDegree: number;
  isolatedCount: number;
  leafCount: number;
}

/** Distribution item (type or predicate with count) */
export interface DistributionItem {
  label: string;
  count: number;
}

/** Type connection matrix */
export interface TypeMatrix {
  types: string[];
  matrix: number[][];
  strongest: { typeA: string; typeB: string; count: number } | null;
  weakest: { typeA: string; typeB: string; count: number } | null;
}

/** Hub entity with degree and predicate breakdown */
export interface HubEntity {
  entity: Entity;
  degree: number;
  predicateBreakdown: DistributionItem[];
}

/** Relationship path pattern */
export interface RelationshipPath {
  sourceType: string;
  predicate: string;
  targetType: string;
  count: number;
}

/** Degree distribution bucket */
export interface DegreeBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

/** Predicate usage for a specific entity type */
export interface PredicateByType {
  type: string;
  predicates: DistributionItem[];
}

/** Multi-edge pair */
export interface MultiEdgePair {
  entityA: Entity;
  entityB: Entity;
  predicates: string[];
}

/** Average degree by type */
export interface AvgDegreeByType {
  type: string;
  avgDegree: number;
  entityCount: number;
}

/** Diverse entity (connected to most different types) */
export interface DiverseEntity {
  entity: Entity;
  typeCount: number;
  types: string[];
}

/** Graph component (disconnected subgraph) */
export interface GraphComponent {
  id: number;
  entityCount: number;
  relCount: number;
  percentage: number;
  isMainComponent: boolean;
}

/** Predicate exclusivity classification */
export interface PredicateExclusivity {
  exclusive: { predicate: string; sourceType: string; targetType: string }[];
  generic: { predicate: string; typePairs: { sourceType: string; targetType: string }[] }[];
}

/** Reciprocal pair */
export interface ReciprocalPair {
  entityA: Entity;
  entityB: Entity;
  predicates: string[];
}

/** Leaf entity with its single connection */
export interface LeafEntity {
  entity: Entity;
  relationship: Relationship;
  connectedEntity: Entity;
}
```

**Step 2: Create const.ts**

Create `src/features/dashboard/const.ts`:
```typescript
/** Number of top hubs to display */
export const TOP_HUBS_COUNT = 5;

/** Number of top relationship paths to display */
export const TOP_PATHS_COUNT = 5;

/** Number of top multi-edge pairs to display */
export const TOP_MULTI_EDGE_COUNT = 5;

/** Number of top diverse entities to display */
export const TOP_DIVERSE_COUNT = 5;

/** Number of top predicates shown per hub */
export const TOP_PREDICATES_PER_HUB = 3;

/** Number of top predicates shown per entity type */
export const TOP_PREDICATES_PER_TYPE = 5;

/** Number of leaf entities to show before collapsing */
export const LEAF_DISPLAY_LIMIT = 6;

/** Degree distribution bucket ranges */
export const DEGREE_BUCKETS = [
  { range: '0 rels', min: 0, max: 0 },
  { range: '1 rel', min: 1, max: 1 },
  { range: '2-3', min: 2, max: 3 },
  { range: '4-6', min: 4, max: 6 },
  { range: '7-10', min: 7, max: 10 },
  { range: '11-15', min: 11, max: 15 },
  { range: '16+', min: 16, max: Infinity }
] as const;

/** Section tooltip descriptions */
export const SECTION_TOOLTIPS = {
  entities: 'Total number of entities (nodes) in this workspace',
  relationships: 'Total number of relationships (edges) connecting entities',
  entityTypes: 'Number of distinct entity types (e.g., Person, Organization)',
  predicateTypes: 'Number of distinct relationship types (e.g., works_for, knows)',
  networkDensity: 'Percentage of possible connections that actually exist. Low density means a sparse graph',
  avgDegree: 'Average number of relationships per entity. Higher means more interconnected',
  isolated: 'Entities with zero connections. May indicate data quality issues',
  leaf: 'Entities with exactly one connection. These are the periphery of the graph',
  entityTypeDistribution: 'Distribution of entities by type. Shows what this graph is primarily about',
  predicateDistribution: 'Distribution of relationship types. Shows the dominant kinds of connections',
  typeMatrix: 'How many relationships exist between each pair of entity types. Reveals the structural backbone of the graph',
  topHubs: 'Most connected entities — the key nodes in the graph. Shows their top predicates',
  relationshipPaths: 'Most common type-to-type connection patterns including the predicate. Shows the dominant information flows',
  degreeDistribution: 'How connections are spread across entities. A long tail means few hubs and many peripheral nodes',
  predicateByType: 'Which predicates each entity type participates in. Shows the role each type plays in the graph',
  multiEdge: 'Entity pairs connected by two or more different predicates. These are the strongest relationships',
  avgDegreeByType: 'Average connections per entity, broken down by type. Shows which types are most interconnected',
  diverseEntities: 'Entities connected to the most different entity types. These are the bridge nodes spanning domains',
  graphComponents: 'Disconnected subgraphs within the workspace. Multiple components may indicate fragmented data',
  predicateExclusivity: 'Whether predicates connect only specific type pairs (exclusive) or multiple type combinations (generic)',
  reciprocalPairs: 'Entity pairs with relationships in both directions. Indicates strong bidirectional connections',
  isolatedEntities: 'Entities with no connections at all. Consider whether these should be linked or removed',
  leafEntities: 'Entities with only one connection. Shown with their single relationship for context'
} as const;
```

**Step 3: Commit**

```bash
git add src/features/dashboard/types.ts src/features/dashboard/const.ts
git commit -m "feat(dashboard): add types and constants for dashboard analytics"
```

---

## Task 3: Create dashboard utility functions with tests

**Files:**
- Create: `src/features/dashboard/utils/dashboard.utils.ts`
- Create: `src/features/dashboard/utils/dashboard.utils.test.ts`

**Step 1: Write the test file**

Create `src/features/dashboard/utils/dashboard.utils.test.ts` with tests for all 16 compute functions. Use a shared test fixture of entities and relationships. Each function gets at least one test verifying the core computation.

Test fixture:
- 5 entities: 2 Person, 1 Organization, 1 Location, 1 Event
- 6 relationships: works_for, knows, located_in, attended (covering various type pairs)
- 1 isolated entity (Event with no rels)

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/features/dashboard/utils/dashboard.utils.test.ts`
Expected: FAIL (functions not defined)

**Step 3: Implement all compute functions**

Create `src/features/dashboard/utils/dashboard.utils.ts` with these pure functions:
- `computeKpiStats(entities, relationships)` — counts, density = actualEdges / (n*(n-1)/2), avgDegree = 2*edges/nodes
- `computeEntityTypeDistribution(entities)` — group by type, sort desc by count
- `computePredicateDistribution(relationships)` — group by predicate, sort desc by count
- `computeTypeMatrix(entities, relationships)` — NxN upper-triangle matrix of rel counts between types
- `computeTopHubs(entities, relationships, topN)` — degree per entity, top N, with predicate breakdown
- `computeDegreeDistribution(entities, relationships)` — bucket entities by degree into DEGREE_BUCKETS
- `computeRelationshipPaths(entities, relationships, topN)` — sourceType→predicate→targetType counts
- `computePredicateByType(entities, relationships)` — per entity type, which predicates they participate in
- `computeMultiEdgePairs(entities, relationships, topN)` — entity pairs with 2+ different predicates
- `computeAvgDegreeByType(entities, relationships)` — avg degree per type
- `computeDiverseEntities(entities, relationships, topN)` — entities connected to most different types
- `computeGraphComponents(entities, relationships)` — BFS to find disconnected components
- `computePredicateExclusivity(entities, relationships)` — classify predicates as exclusive or generic
- `computeReciprocalPairs(entities, relationships)` — find A→B and B→A pairs
- `computeIsolatedEntities(entities, relationships)` — entities with degree 0
- `computeLeafEntities(entities, relationships)` — entities with degree 1, with their single rel

Each function takes `Entity[]` and `Relationship[]` as input. Build an entity map and degree map once internally where needed.

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/features/dashboard/utils/dashboard.utils.test.ts`
Expected: PASS (all tests green)

**Step 5: Commit**

```bash
git add src/features/dashboard/utils/
git commit -m "feat(dashboard): add analytics utility functions with tests"
```

---

## Task 4: Create reusable DashboardSection and DashboardBar components

**Files:**
- Create: `src/features/dashboard/components/dashboard-section.component.tsx`
- Create: `src/features/dashboard/components/dashboard-bar.component.tsx`

**Step 1: Create DashboardSection**

Create `src/features/dashboard/components/dashboard-section.component.tsx`:
- Wraps children in Shadcn `Card` with compact padding
- Shows title + info icon with `Tooltip` showing description
- Optional `Badge` for count

**Step 2: Create DashboardBar**

Create `src/features/dashboard/components/dashboard-bar.component.tsx`:
- Props: `label: string`, `value: number`, `maxValue: number`
- Renders: truncated label, CSS-width bar (`bg-primary` on `bg-muted`), count number
- Bar width = `(value / maxValue) * 100` percent

**Step 3: Verify lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/dashboard/components/dashboard-section.component.tsx src/features/dashboard/components/dashboard-bar.component.tsx
git commit -m "feat(dashboard): add reusable DashboardSection and DashboardBar components"
```

---

## Task 5: Create KPI Cards panel component

**Files:**
- Create: `src/features/dashboard/components/dashboard-kpi-cards.component.tsx`

**Step 1: Create component**

Renders 8 KPI cards in a flex row. Each card is a small box with:
- Label (with tooltip via Shadcn Tooltip)
- Large number value
- Warning icon for isolated count if > 0

Props: `stats: KpiStats`

Uses `SECTION_TOOLTIPS` from const.ts for each card's tooltip.

**Step 2: Commit**

```bash
git add src/features/dashboard/components/dashboard-kpi-cards.component.tsx
git commit -m "feat(dashboard): add KPI cards panel component"
```

---

## Task 6: Create composition panel components (Entity Types + Predicates)

**Files:**
- Create: `src/features/dashboard/components/dashboard-entity-types.component.tsx`
- Create: `src/features/dashboard/components/dashboard-predicates.component.tsx`

**Step 1: Create entity types component**

Uses `DashboardSection` wrapper + maps `DistributionItem[]` through `DashboardBar`.

**Step 2: Create predicates component**

Same pattern as entity types but for predicate distribution.

**Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard-entity-types.component.tsx src/features/dashboard/components/dashboard-predicates.component.tsx
git commit -m "feat(dashboard): add entity types and predicates panel components"
```

---

## Task 7: Create structure panel components (Type Matrix + Top Hubs)

**Files:**
- Create: `src/features/dashboard/components/dashboard-type-matrix.component.tsx`
- Create: `src/features/dashboard/components/dashboard-top-hubs.component.tsx`

**Step 1: Create type matrix component**

Renders NxN grid using CSS grid or table. Row/column headers are abbreviated type names. Cell values colored by intensity (higher = darker `bg-primary` opacity). Shows strongest/weakest callouts below matrix.

**Step 2: Create top hubs component**

Ranked list: entity name, type badge, degree bar, top predicate breakdown as small text.

**Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard-type-matrix.component.tsx src/features/dashboard/components/dashboard-top-hubs.component.tsx
git commit -m "feat(dashboard): add type matrix and top hubs panel components"
```

---

## Task 8: Create pattern panel components (Relationship Paths + Degree Distribution)

**Files:**
- Create: `src/features/dashboard/components/dashboard-relationship-paths.component.tsx`
- Create: `src/features/dashboard/components/dashboard-degree-distribution.component.tsx`

**Step 1: Create relationship paths component**

Shows top N paths as: `SourceType — predicate —> TargetType [count]` with bar.

**Step 2: Create degree distribution component**

Uses `DashboardBar` for each bucket. Shows median and max callouts.

**Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard-relationship-paths.component.tsx src/features/dashboard/components/dashboard-degree-distribution.component.tsx
git commit -m "feat(dashboard): add relationship paths and degree distribution panels"
```

---

## Task 9: Create predicate-by-type panel component (full width)

**Files:**
- Create: `src/features/dashboard/components/dashboard-predicate-by-type.component.tsx`

**Step 1: Create component**

Full-width section. For each entity type, shows a row with the type name and inline small bars for its top predicates.

**Step 2: Commit**

```bash
git add src/features/dashboard/components/dashboard-predicate-by-type.component.tsx
git commit -m "feat(dashboard): add predicate-by-type panel component"
```

---

## Task 10: Create remaining 2-column panels (Multi-Edge, Avg Degree, Diverse, Components, Exclusivity, Reciprocal)

**Files:**
- Create: `src/features/dashboard/components/dashboard-multi-edge.component.tsx`
- Create: `src/features/dashboard/components/dashboard-avg-degree-by-type.component.tsx`
- Create: `src/features/dashboard/components/dashboard-diverse-entities.component.tsx`
- Create: `src/features/dashboard/components/dashboard-graph-components.component.tsx`
- Create: `src/features/dashboard/components/dashboard-predicate-exclusivity.component.tsx`
- Create: `src/features/dashboard/components/dashboard-reciprocal-pairs.component.tsx`

**Step 1: Create all 6 components**

Each follows the same pattern: DashboardSection wrapper, render data from props.

- **Multi-Edge**: List of entity pairs with their multiple predicates
- **Avg Degree by Type**: Bars for each type's average, with overall average line
- **Diverse Entities**: Ranked list with type count and type names
- **Graph Components**: Cards for each component showing entity count, rel count, percentage
- **Predicate Exclusivity**: Two sections (exclusive, generic) listing predicates with their type pairs
- **Reciprocal Pairs**: List of bidirectional entity pairs with their predicates

**Step 2: Commit**

```bash
git add src/features/dashboard/components/dashboard-multi-edge.component.tsx \
  src/features/dashboard/components/dashboard-avg-degree-by-type.component.tsx \
  src/features/dashboard/components/dashboard-diverse-entities.component.tsx \
  src/features/dashboard/components/dashboard-graph-components.component.tsx \
  src/features/dashboard/components/dashboard-predicate-exclusivity.component.tsx \
  src/features/dashboard/components/dashboard-reciprocal-pairs.component.tsx
git commit -m "feat(dashboard): add remaining analytics panel components"
```

---

## Task 11: Create data quality panels (Isolated + Leaf entities)

**Files:**
- Create: `src/features/dashboard/components/dashboard-isolated.component.tsx`
- Create: `src/features/dashboard/components/dashboard-leaf.component.tsx`

**Step 1: Create isolated entities component**

Full-width section. Grid of entity chips showing name + type badge. Warning icon in header.

**Step 2: Create leaf entities component**

Full-width section. Each leaf shows: entity name + type — predicate —> connected entity name. Collapsible with "+N more" if exceeds `LEAF_DISPLAY_LIMIT`.

**Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard-isolated.component.tsx src/features/dashboard/components/dashboard-leaf.component.tsx
git commit -m "feat(dashboard): add isolated and leaf entity panel components"
```

---

## Task 12: Create main Dashboard container component

**Files:**
- Create: `src/features/dashboard/components/dashboard.component.tsx`

**Step 1: Create component**

The main container that:
1. Takes `workspaceId` and `workspaceName` as props
2. Calls `useWorkspaceQuery(workspaceId)` to get data
3. Uses `useMemo` to compute all 16 analytics from `entityList` + `relationshipList`
4. Renders loading/error states
5. Renders the 2-column grid layout with all panel components
6. Layout order:
   - KPI cards (full width)
   - Entity Types + Predicates (2-col)
   - Type Matrix + Top Hubs (2-col)
   - Relationship Paths + Degree Distribution (2-col)
   - Predicate by Type (full width)
   - Multi-Edge + Avg Degree by Type (2-col)
   - Diverse Entities + Graph Components (2-col)
   - Predicate Exclusivity + Reciprocal Pairs (2-col)
   - Isolated Entities (full width)
   - Leaf Entities (full width)

**Step 2: Verify lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard.component.tsx
git commit -m "feat(dashboard): add main dashboard container component"
```

---

## Task 13: Wire up Dashboard in tab content router

**Files:**
- Modify: `src/features/type-tabs/components/type-tab-content.component.tsx:8-9` (imports)
- Modify: `src/features/type-tabs/components/type-tab-content.component.tsx:21-23` (switch cases)

**Step 1: Add import and DASHBOARD case**

Add import at top:
```typescript
import DashboardComponent from '@/features/dashboard/components/dashboard.component';
import { DashboardData } from '@/stores/type-tabs/type-tabs.store';
```

Add case before `'BAR'` in switch:
```typescript
case 'DASHBOARD': {
  const data = tab.data as DashboardData;
  return <DashboardComponent workspaceId={data.workspaceId} workspaceName={data.workspaceName} />;
}
```

**Step 2: Verify lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/type-tabs/components/type-tab-content.component.tsx
git commit -m "feat(dashboard): wire dashboard component into tab content router"
```

---

## Task 14: Add Dashboard button to workspace toolbar

**Files:**
- Modify: `src/features/workspace/components/workspace-toolbar.component.tsx`

**Step 1: Update toolbar**

1. Add `LayoutDashboard` to lucide imports
2. Add `onOpenDashboard` callback to Props interface
3. Change outer div from `justify-end` to `justify-between`
4. Add left button group with Dashboard button
5. Keep Filter button in right group

Updated component:
```typescript
interface Props {
  hiddenCount: number;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  onOpenDashboard: () => void;
}
```

**Step 2: Verify lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace-toolbar.component.tsx
git commit -m "feat(dashboard): add Dashboard button to workspace toolbar"
```

---

## Task 15: Connect Dashboard button in WorkspaceComponent

**Files:**
- Modify: `src/features/workspace/components/workspace.component.tsx:410-414` (toolbar props)

**Step 1: Add dashboard handler**

In `workspace.component.tsx`:
1. Import `useTypeTabActions` from `@/stores/type-tabs/type-tabs.selector`
2. Import `DashboardData` from `@/stores/type-tabs/type-tabs.store`
3. Import `useUiActions` for `toggleToolbar` (to ensure bottom panel is open)
4. Add `handleOpenDashboard` callback that:
   - Creates a tab with `id: `dashboard-${workspaceId}`, type: 'DASHBOARD', name: `Dashboard: ${workspace.name}`, data: { workspaceId, workspaceName: workspace.name }`
   - Calls `openChartTab(tab)` to open/activate it
   - Ensures bottom panel shows CHARTS via `toggleToolbar('bottom', 'CHARTS')` if not already open
5. Pass `onOpenDashboard={handleOpenDashboard}` to `WorkspaceToolbarComponent`

**Step 2: Verify lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "feat(dashboard): connect dashboard button to open dashboard tab"
```

---

## Task 16: Final verification

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat(dashboard): workspace analytics dashboard complete"
```

---

## Review

### Summary

Successfully implemented the workspace analytics dashboard feature. The dashboard provides 14 analytical panels with high-level insights about entity-relationship graphs in `.ws` files.

### Changes Made

**27 files changed** (+2,573 lines, -21 lines modified)

| Category | Files | Description |
|----------|-------|-------------|
| Store | 1 modified | Added `DASHBOARD` to ChartType union, `DashboardData` interface |
| Types & Constants | 2 new | 14 analytics interfaces, 23 tooltip strings, bucket configs |
| Analytics Utils | 2 new | 16 pure compute functions + 48 tests (all passing) |
| UI Components | 19 new | 2 reusable (Section, Bar) + 14 panels + 1 KPI cards + 1 container + 1 main |
| Wiring | 3 modified | Tab content router, workspace toolbar, workspace component |

### Commits (7)

1. `b7e4ab5` — Add DASHBOARD chart type
2. `d1b1f55` — Add types and constants
3. `49c3ae3` — Add analytics utility functions with tests
4. `e0cb310` — Add reusable DashboardSection and DashboardBar
5. `7392d37` — Add all analytics panel components
6. `1a70e67` — Add main dashboard container
7. `c02f2a3` — Wire into tab router and workspace toolbar

### Verification

- **Tests**: 156/156 passing (48 new dashboard tests)
- **Lint**: Clean (0 errors)
- **Build**: Successful

### Architecture Notes

- All analytics computed client-side via `useMemo` — no new API calls
- Pure CSS bars (Tailwind) — no chart library added
- Dashboard tab uses stable ID `dashboard-${workspaceId}` so clicking button again activates existing tab
- `toggleToolbar('bottom', 'CHARTS')` ensures bottom panel opens when dashboard is created
