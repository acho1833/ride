# Workspace Dashboard Design

## Overview

A dashboard view for `.ws` files that provides high-level analytical insights about the entity-relationship graph. Accessed via a "Dashboard" button on the workspace toolbar (left side), which opens a new tab in the bottom panel's chart tab system.

## Architecture & Data Flow

```
User clicks "Dashboard" on workspace toolbar
        |
        v
openChartTab({ type: 'DASHBOARD', data: { workspaceId, workspaceName } })
        |
        v
TypeTabContent switch: case 'DASHBOARD' -> <DashboardComponent>
        |
        v
useWorkspaceQuery(workspaceId) -> entityList + relationshipList
        |
        v
useMemo -> compute all analytics from raw data (pure functions in dashboard.utils.ts)
        |
        v
Render 14 panels in 2-column scrollable grid
```

Key decisions:
- No new API calls - all analytics computed client-side from existing workspace data
- No new store slice - uses existing type-tabs store + workspace query
- Pure CSS bars (Tailwind width percentages) - no chart library
- Shadcn Card + Tooltip (both already installed)
- One component per panel (one-component-per-file rule)

## File Structure

### New Files

```
src/features/dashboard/
├── components/
│   ├── dashboard.component.tsx                     # Main container (scrollable grid)
│   ├── dashboard-kpi-cards.component.tsx            # 8 KPI summary cards row
│   ├── dashboard-entity-types.component.tsx         # Entity type horizontal bars
│   ├── dashboard-predicates.component.tsx           # Predicate distribution bars
│   ├── dashboard-type-matrix.component.tsx          # Type connection matrix grid
│   ├── dashboard-top-hubs.component.tsx             # Top 5 most connected entities
│   ├── dashboard-relationship-paths.component.tsx   # Top type->pred->type patterns
│   ├── dashboard-degree-distribution.component.tsx  # Degree histogram
│   ├── dashboard-predicate-by-type.component.tsx    # Predicate usage per entity type
│   ├── dashboard-multi-edge.component.tsx           # Multi-edge pairs
│   ├── dashboard-avg-degree-by-type.component.tsx   # Avg degree per type
│   ├── dashboard-diverse-entities.component.tsx     # Most diverse entities
│   ├── dashboard-graph-components.component.tsx     # Disconnected subgraphs
│   ├── dashboard-predicate-exclusivity.component.tsx # Exclusive vs generic predicates
│   ├── dashboard-reciprocal-pairs.component.tsx     # Bidirectional relationships
│   ├── dashboard-isolated.component.tsx             # Isolated entities (0 rels)
│   ├── dashboard-leaf.component.tsx                 # Leaf entities (1 rel)
│   ├── dashboard-section.component.tsx              # Reusable section wrapper with tooltip
│   └── dashboard-bar.component.tsx                  # Reusable horizontal bar component
├── utils/
│   └── dashboard.utils.ts                          # All analytics computation (pure functions)
├── types.ts                                        # Dashboard-specific interfaces
└── const.ts                                        # Tooltips, TOP_N counts, labels
```

### Modified Files

```
src/stores/type-tabs/type-tabs.store.ts                             # Add 'DASHBOARD' to ChartType, add DashboardData
src/features/type-tabs/components/type-tab-content.component.tsx    # Add DASHBOARD case to switch
src/features/workspace/components/workspace-toolbar.component.tsx   # Add Dashboard button (left side)
```

## Layout

2-column grid with vertical scroll. KPI cards span full width at top. Full-width sections at bottom for data quality.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard: workspace-name.ws                                                                          [R]  │
│                                                                                                             │
│  [Entities] [Rels] [Types] [Predics] [Density] [Avg Deg] [Isolated] [Leaf]   <-- KPI cards full width     │
│                                                                                                             │
│  ┌─ Entity Types ──────────────────────┐  ┌─ Predicate Distribution ──────────┐                            │
│  │ Horizontal bars                     │  │ Horizontal bars                    │                            │
│  └─────────────────────────────────────┘  └────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Type Connection Matrix ────────────┐  ┌─ Top Hubs ────────────────────────┐                            │
│  │ NxN grid of counts                  │  │ Ranked list with bars + predicates │                            │
│  └─────────────────────────────────────┘  └────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Relationship Paths ────────────────┐  ┌─ Degree Distribution ─────────────┐                            │
│  │ Type->pred->type with bars          │  │ Histogram of connection ranges     │                            │
│  └─────────────────────────────────────┘  └────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Predicate Usage by Entity Type ───────────────────────────────────────────┐  <-- full width            │
│  │ Per-type predicate breakdown                                               │                            │
│  └────────────────────────────────────────────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Multi-Edge Pairs ─────────────────┐  ┌─ Avg Degree by Type ──────────────┐                            │
│  │ Entity pairs with 2+ predicates    │  │ Bars with overall average line     │                            │
│  └─────────────────────────────────────┘  └────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Most Diverse Entities ────────────┐  ┌─ Graph Components ────────────────┐                            │
│  │ Entities spanning most types       │  │ Disconnected subgraph boxes       │                            │
│  └─────────────────────────────────────┘  └────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Predicate Exclusivity ────────────┐  ┌─ Reciprocal Pairs ────────────────┐                            │
│  │ Exclusive vs generic predicates    │  │ Bidirectional relationships        │                            │
│  └─────────────────────────────────────┘  └────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Isolated Entities ────────────────────────────────────────────────────────┐  <-- full width            │
│  │ Grid of entities with 0 connections                                        │                            │
│  └────────────────────────────────────────────────────────────────────────────┘                            │
│                                                                                                             │
│  ┌─ Leaf Entities ────────────────────────────────────────────────────────────┐  <-- full width            │
│  │ Entities with 1 connection, shown with their single relationship           │                            │
│  └────────────────────────────────────────────────────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Section Tooltips

| Section | Tooltip |
|---------|---------|
| KPI: Entities | Total number of entities (nodes) in this workspace |
| KPI: Relationships | Total number of relationships (edges) connecting entities |
| KPI: Entity Types | Number of distinct entity types (e.g., Person, Organization) |
| KPI: Predicates | Number of distinct relationship types (e.g., works_for, knows) |
| KPI: Network Density | Percentage of possible connections that actually exist. Low density means a sparse graph |
| KPI: Avg Degree | Average number of relationships per entity. Higher means more interconnected |
| KPI: Isolated | Entities with zero connections. May indicate data quality issues |
| KPI: Leaf | Entities with exactly one connection. These are the periphery of the graph |
| Entity Types | Distribution of entities by type. Shows what this graph is primarily about |
| Predicates | Distribution of relationship types. Shows the dominant kinds of connections |
| Type Connection Matrix | How many relationships exist between each pair of entity types. Reveals the structural backbone |
| Top Hubs | Most connected entities. Shows their top predicates |
| Relationship Paths | Most common type-to-type connection patterns including the predicate |
| Degree Distribution | How connections are spread across entities. A long tail means few hubs and many peripheral nodes |
| Predicate by Type | Which predicates each entity type participates in. Shows the role each type plays |
| Multi-Edge Pairs | Entity pairs connected by two or more different predicates. Strongest relationships |
| Avg Degree by Type | Average connections per entity by type. Shows which types are most interconnected |
| Most Diverse | Entities connected to the most different entity types. Bridge nodes spanning domains |
| Graph Components | Disconnected subgraphs. Multiple components may indicate fragmented data |
| Predicate Exclusivity | Whether predicates connect only specific type pairs or multiple combinations |
| Reciprocal Pairs | Entity pairs with relationships in both directions. Bidirectional connections |
| Isolated Entities | Entities with no connections. Consider whether these should be linked or removed |
| Leaf Entities | Entities with only one connection. Shown with their single relationship for context |

## Analytics Functions (dashboard.utils.ts)

All pure functions taking `(entities, relationships)` and returning computed results:

- `computeKpiStats` -> totals, density, avg degree, isolated/leaf counts
- `computeEntityTypeDistribution` -> { type, count }[]
- `computePredicateDistribution` -> { predicate, count }[]
- `computeTypeMatrix` -> { matrix, types, strongest, weakest }
- `computeTopHubs` -> { entity, degree, predicateBreakdown }[]
- `computeDegreeDistribution` -> { range, count }[]
- `computeRelationshipPaths` -> { sourceType, predicate, targetType, count }[]
- `computePredicateByType` -> { type, predicates: { predicate, count }[] }[]
- `computeMultiEdgePairs` -> { entityA, entityB, predicates }[]
- `computeAvgDegreeByType` -> { type, avgDegree, count }[]
- `computeDiverseEntities` -> { entity, typeCount, types }[]
- `computeGraphComponents` -> { id, entityCount, relCount, percentage }[]
- `computePredicateExclusivity` -> { exclusive: [...], generic: [...] }
- `computeReciprocalPairs` -> { entityA, entityB, predicates }[]
- `computeIsolatedEntities` -> Entity[]
- `computeLeafEntities` -> { entity, relationship, connectedEntity }[]

## Reusable Components

### DashboardSection
Wraps every panel with consistent Card + tooltip styling:
- Shadcn Card as container
- Title with Info icon + Shadcn Tooltip
- Optional count Badge

### DashboardBar
Reusable horizontal bar:
- Label (truncated), CSS-width bar (bg-primary on bg-muted), count
- Props: label, value, maxValue

## Modified Files Detail

### type-tabs.store.ts
- Add `'DASHBOARD'` to `ChartType` union
- Add `DashboardData` interface: `{ workspaceId: string; workspaceName: string }`

### type-tab-content.component.tsx
- Add `case 'DASHBOARD':` to switch returning `<DashboardComponent>`

### workspace-toolbar.component.tsx
- Change `justify-end` to `justify-between`
- Add left button group with Dashboard button (LayoutDashboard icon from lucide)
- Keep Filter button in right group
