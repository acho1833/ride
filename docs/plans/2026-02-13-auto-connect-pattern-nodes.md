# Auto-Connect Pattern Nodes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When adding a new node to the pattern builder (via "Add Node" button or drag-from-search), automatically connect it to the tail of the existing chain — but only if the pattern already has edges.

**Architecture:** Add a helper function `getChainTailNodeId` to find the node at the end of the chain (no outgoing edges), then modify `addNode` and `addNodeFromEntity` to create an auto-edge when a tail exists.

**Tech Stack:** Zustand store (TypeScript)

---

### Task 1: Add `getChainTailNodeId` helper and update `addNode`

**Files:**
- Modify: `src/stores/pattern-search/pattern-search.store.ts:82-128`

**Step 1: Add the helper function**

Add after `getNextNodePosition` (line 92):

```typescript
/** Find the tail node of the chain (node with no outgoing edges).
 *  Returns null if there are no edges (pattern is not connected). */
function getChainTailNodeId(nodes: PatternNode[], edges: PatternEdge[]): string | null {
  if (edges.length === 0) return null;

  const sourceIds = new Set(edges.map(e => e.sourceNodeId));

  // Tail = last node (by array order) that is part of the graph but has no outgoing edge
  for (let i = nodes.length - 1; i >= 0; i--) {
    const nodeId = nodes[i].id;
    const isInGraph = sourceIds.has(nodeId) || edges.some(e => e.targetNodeId === nodeId);
    if (isInGraph && !sourceIds.has(nodeId)) return nodeId;
  }

  return null;
}
```

**Step 2: Update `addNode` to auto-connect**

Replace the `addNode` action (lines 111-128) with:

```typescript
addNode: () =>
  set(state => {
    const { nodes, edges } = state.patternSearch;
    const tailNodeId = getChainTailNodeId(nodes, edges);
    const newNode: PatternNode = {
      id: `node-${Date.now()}`,
      label: getNextNodeLabel(nodes),
      type: null,
      filters: [],
      position: getNextNodePosition(nodes)
    };
    const newEdges = tailNodeId
      ? [...edges, { id: `edge-${Date.now()}-auto`, sourceNodeId: tailNodeId, targetNodeId: newNode.id, predicates: [] }]
      : edges;
    return {
      patternSearch: {
        ...state.patternSearch,
        nodes: [...nodes, newNode],
        edges: newEdges,
        selectedNodeId: newNode.id,
        selectedEdgeId: null
      }
    };
  }),
```

**Step 3: Update `addNodeFromEntity` to auto-connect**

Replace the `addNodeFromEntity` action (lines 130-147) with:

```typescript
addNodeFromEntity: (entityType, entityName, position) =>
  set(state => {
    const { nodes, edges } = state.patternSearch;
    const tailNodeId = getChainTailNodeId(nodes, edges);
    const newNode: PatternNode = {
      id: `node-${Date.now()}`,
      label: getNextNodeLabel(nodes),
      type: entityType,
      filters: [{ attribute: 'labelNormalized', patterns: [entityName] }],
      position: position ?? getNextNodePosition(nodes)
    };
    const newEdges = tailNodeId
      ? [...edges, { id: `edge-${Date.now()}-auto`, sourceNodeId: tailNodeId, targetNodeId: newNode.id, predicates: [] }]
      : edges;
    return {
      patternSearch: {
        ...state.patternSearch,
        nodes: [...nodes, newNode],
        edges: newEdges,
        selectedNodeId: newNode.id,
        selectedEdgeId: null
      }
    };
  }),
```

**Step 4: Verify build**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/pattern-search/pattern-search.store.ts
git commit -m "feat: auto-connect new pattern nodes to chain tail"
```

---

## Summary

- 1 file modified: `pattern-search.store.ts`
- 1 new helper: `getChainTailNodeId`
- 2 actions updated: `addNode`, `addNodeFromEntity`
- No component changes needed — edges are already rendered by React Flow from the store
