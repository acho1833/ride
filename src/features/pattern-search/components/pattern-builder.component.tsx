'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlusIcon } from 'lucide-react';
import PatternNodeComponent from './pattern-node.component';
import PatternEdgeComponent from './pattern-edge.component';
import NodeConfigPanelComponent from './node-config-panel.component';
import EdgeConfigPanelComponent from './edge-config-panel.component';
import {
  usePatternNodes,
  usePatternEdges,
  useSelectedNode,
  useSelectedEdge,
  usePatternSearchActions
} from '@/stores/pattern-search/pattern-search.selector';

/** Register custom node types */
const nodeTypes = {
  patternNode: PatternNodeComponent
} as const;

/** Register custom edge types */
const edgeTypes = {
  patternEdge: PatternEdgeComponent
} as const;

/**
 * Pattern builder component with React Flow canvas.
 * Manages node/edge creation, selection, and configuration.
 * Search is now automatic (triggered by advanced-search when pattern is complete).
 */
const PatternBuilderComponent = () => {
  // Get pattern state from store
  const patternNodes = usePatternNodes();
  const patternEdges = usePatternEdges();
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  const {
    addNode,
    updateNode,
    deleteNode,
    addNodeFilter,
    updateNodeFilter,
    removeNodeFilter,
    addEdge,
    updateEdge,
    deleteEdge,
    selectNode,
    selectEdge
  } = usePatternSearchActions();

  // Convert store nodes to React Flow nodes
  const flowNodes: Node[] = useMemo(
    () =>
      patternNodes.map(node => ({
        id: node.id,
        type: 'patternNode',
        position: node.position,
        data: {
          label: node.label,
          type: node.type,
          filters: node.filters,
          selected: selectedNode?.id === node.id
        }
      })),
    [patternNodes, selectedNode]
  );

  // Convert store edges to React Flow edges
  const flowEdges: Edge[] = useMemo(
    () =>
      patternEdges.map(edge => ({
        id: edge.id,
        type: 'patternEdge',
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          predicates: edge.predicates,
          selected: selectedEdge?.id === edge.id
        }
      })),
    [patternEdges, selectedEdge]
  );

  // Handle node position changes
  const onNodesChange: OnNodesChange = useCallback(
    changes => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNode(change.id, { position: change.position });
        }
      }
    },
    [updateNode]
  );

  // Handle edge changes (not used for position, but required by React Flow)
  const onEdgesChange: OnEdgesChange = useCallback(() => {
    // We handle edge deletion via config panel, not via React Flow
  }, []);

  // Handle new connection
  const onConnect: OnConnect = useCallback(
    connection => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target);
      }
    },
    [addEdge]
  );

  // Handle node click (select node)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle edge click (select edge)
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Handle delete key to remove selected node or edge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        if (selectedNode) {
          deleteNode(selectedNode.id);
        } else if (selectedEdge) {
          deleteEdge(selectedEdge.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, deleteNode, deleteEdge]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar - Search is automatic, only Add Node button needed */}
      <div className="flex items-center gap-x-2 py-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNode}>
          <PlusIcon className="mr-1 h-3 w-3" />
          Add Node
        </Button>
      </div>

      <Separator />

      {/* Canvas + Config Panel */}
      <div className="flex min-h-0 flex-1">
        {/* React Flow Canvas */}
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {(selectedNode || selectedEdge) && (
          <>
            <Separator orientation="vertical" />
            <div className="w-[200px] overflow-y-auto">
              {selectedNode && (
                <NodeConfigPanelComponent
                  key={selectedNode.id}
                  node={selectedNode}
                  onUpdate={updates => updateNode(selectedNode.id, updates)}
                  onAddFilter={filter => addNodeFilter(selectedNode.id, filter)}
                  onUpdateFilter={(index, updates) => updateNodeFilter(selectedNode.id, index, updates)}
                  onRemoveFilter={index => removeNodeFilter(selectedNode.id, index)}
                  onDelete={() => deleteNode(selectedNode.id)}
                />
              )}
              {selectedEdge && (
                <EdgeConfigPanelComponent
                  key={selectedEdge.id}
                  edge={selectedEdge}
                  nodes={patternNodes}
                  onUpdate={updates => updateEdge(selectedEdge.id, updates)}
                  onDelete={() => deleteEdge(selectedEdge.id)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatternBuilderComponent;
