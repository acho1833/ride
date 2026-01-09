# `.gx` Collaboration Graph Visualization - Design Document

## Overview

A new file extension (`.gx`) that renders an interactive collaboration network graph with timeline analysis. The visualization answers: **"Who are my most frequent collaborators over time, and how are they connected?"**

## Core Concepts

### Data Model

The `.gx` file contains structured JSON data:

```json
{
  "target": {
    "id": "you",
    "name": "Dr. Smith"
  },
  "collaborators": [
    {
      "id": "alice",
      "name": "Alice Chen",
      "collaborations": [
        { "year": 2018 },
        { "year": 2019 },
        { "year": 2020 },
        { "year": 2022 },
        { "year": 2023 }
      ]
    }
  ],
  "connections": [
    { "source": "you", "target": "alice" },
    { "source": "alice", "target": "bob" }
  ]
}
```

- **target**: The center person (YOU) around whom the graph is built
- **collaborators**: People who have collaborated with the target, with year-by-year history
- **connections**: "Who knows who" relationships (edges in the graph)

### Hop Distance

Hop count represents relationship distance from the target:
- **Hop 0**: Target (YOU)
- **Hop 1**: Directly connected to target
- **Hop 2**: Connected through 1 intermediary
- **Hop 3**: Connected through 2 intermediaries
- **Hop 4**: Connected through 3 intermediaries

Hop distance is **implicit** from the graph layout (visual proximity to center), not displayed in nodes.

## Visual Design

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LEGEND:  ■ 1-5   ■ 6-10   ■ 11-15   ■ 16-20   ■ 21+                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                          NETWORK VIEW                                   │
│                                                                         │
│                    ┌───┐              ┌───┐                              │
│                    │ 4 │              │ 6 │                              │
│                    └───┘              └───┘                              │
│                    Frank              Grace                              │
│                       ╲                ╱                                 │
│                        ╲   ┌────┐    ╱                                  │
│                         ╲  │ 12 │   ╱                                   │
│                          ╲ └────┘  ╱                                    │
│                           ╲Alice  ╱                                     │
│                            ╲    ╱                                       │
│              ┌──────────┐   ╲  ╱    ┌────┐                              │
│              │ Dr.Smith │━━━━╳━━━━━━│ 20 │                              │
│              └──────────┘          └────┘                               │
│                (target)              Bob ← selected                     │
│                    ┃                                                    │
│                    ┃                                                    │
│                 ┌────┐                                                  │
│                 │ 8  │ ← selected                                       │
│                 └────┘                                                  │
│                 Charlie                                                 │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│   TIMELINE (selected: Bob, Charlie)                                     │
│                                                                         │
│        2017    2018    2019    2020    2021    2022    2023    2024     │
│          │       │       │       │       │       │       │       │      │
│     Bob  ●━━━━━━━●━━━━━━━●       .       .       ●━━━━━━━●━━━━━━━●      │
│          │       │       │       │       │       │       │       │      │
│ Charlie  .       .       ●━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━●       .      │
│          │       │       │       │       │       │       │       │      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Node Design

**Target Node (Center)**
- Displays person's name inside (e.g., "Dr. Smith")
- Visually distinct (different shape or border style)
- Fixed at center position

**Collaborator Nodes**
- Number inside = collaboration count with target
- Name displayed below node
- Uniform size (all nodes same size)
- Color = 5-tier frequency category

**5-Tier Color Scale (Categorical)**
| Tier | Range | Color |
|------|-------|-------|
| 1 | 1-5 collaborations | Blue |
| 2 | 6-10 collaborations | Green |
| 3 | 11-15 collaborations | Yellow |
| 4 | 16-20 collaborations | Orange |
| 5 | 21+ collaborations | Red |

### Selection Behavior

- **Click node**: Toggle selection (add/remove from selected set)
- **Selected indicator**: Highlight ring + fill color change
- **Multi-select**: Multiple nodes can be selected simultaneously
- **Timeline sync**: Timeline panel shows all selected nodes

### Timeline Panel

- **X-axis**: Years (auto-scaled to data range)
- **Y-axis**: One row per selected node
- **Visual encoding**:
  - `●` = collaboration occurred that year
  - `━` = line connecting consecutive collaboration years
  - `.` or gap = no collaboration that year
- **Purpose**: Compare collaboration patterns, identify active periods and gaps

### Graph Interactions

- **Pan**: Drag on empty space
- **Zoom**: Ctrl + scroll wheel (matching existing `.ws` pattern)
- **Drag nodes**: Click and drag to reposition
- **Zoom controls**: +/- buttons and fit-to-view

## Technical Implementation

### File Structure

```
src/features/collaboration-graph/
├── components/
│   ├── collaboration-graph.component.tsx    # Main D3 graph
│   ├── collaboration-timeline.component.tsx # Timeline panel
│   └── collaboration-legend.component.tsx   # Color legend
├── const.ts                                  # Colors, config
├── types.ts                                  # TypeScript interfaces
└── utils.ts                                  # Data processing helpers
```

### Technology

- **D3.js**: Force-directed graph layout (already in project for `.ws` files)
- **React**: Component structure, state management
- **Zustand**: Selection state (selected node IDs)

### Data Flow

1. `.gx` file loaded → parse JSON
2. Compute hop distances from target (BFS)
3. Compute collaboration counts per node
4. Assign color tiers based on counts
5. Initialize D3 force simulation
6. Render graph + legend
7. On selection change → update timeline panel

### Demo Data

~30 nodes across 4 hops with varied collaboration patterns:

**Hop 1 (Direct - 5 nodes)**
- Alice: 12 collaborations (2018-2023, gap in 2021)
- Bob: 20 collaborations (2017-2019, 2022-2024)
- Charlie: 8 collaborations (2019-2023)
- Diana: 15 collaborations (2016-2024, consistent)
- Eve: 3 collaborations (2023-2024)

**Hop 2 (8 nodes)**
- Connected through Hop 1 nodes
- Varied collaboration counts (2-18)

**Hop 3 (10 nodes)**
- Connected through Hop 2 nodes
- Varied collaboration counts (1-12)

**Hop 4 (7 nodes)**
- Connected through Hop 3 nodes
- Lower collaboration counts (1-8)

## Integration Points

### Editor Registration

Add to `src/features/editor/components/editor-content.component.tsx`:

```typescript
case 'gx':
  return <CollaborationGraphComponent fileId={fileId} fileName={fileName} />;
```

Note: No ScrollArea wrapper (same as `.ws` files).

### File Icon

Add `.gx` extension to file icon mapping in the file explorer.

## Success Criteria

1. Graph renders ~30 nodes without performance issues
2. Hop distance is visually apparent from layout
3. Color tiers clearly distinguish collaboration frequency
4. Multi-select works smoothly with timeline sync
5. Timeline accurately shows collaboration years and gaps
6. Standard zoom/pan interactions work as expected
