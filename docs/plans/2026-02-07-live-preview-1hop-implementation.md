# Live 1-Hop Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Alt+Click preview of 1-hop connections for workspace graph entities, with grouped summary for high-connection entities.

**Architecture:** State managed in workspace.component.tsx via useGraphPreview hook. Preview rendered as sibling layer to main graph. workspace-graph.component.tsx only detects Alt+Click and disables conflicting interactions.

**Tech Stack:** React, D3.js, TypeScript, Tailwind CSS, sonner (toasts)

---

## Task 1: Add Preview Constants and Types

**Files:**
- Modify: `src/features/workspace/const.ts`
- Modify: `src/features/workspace/types.ts`

**Step 1: Add preview configuration to const.ts**

Add after `SELECTION_CONFIG`:

```typescript
/**
 * Preview mode configuration.
 */
export const PREVIEW_CONFIG = {
  /** Maximum entities to show as individual nodes before grouping */
  threshold: 50,
  /** Preview node opacity (0-1) */
  nodeOpacity: 0.6,
  /** Preview node border color */
  borderColor: 'hsl(0, 0%, 60%)',
  /** Preview connecting line dash pattern */
  lineDash: '4,4',
  /** Distance from source node for preview nodes */
  previewDistance: 120
} as const;
```

**Step 2: Add preview types to types.ts**

Add at end of file:

```typescript
/**
 * Grouped preview data for entities exceeding threshold.
 */
export interface PreviewGroup {
  entityType: string;
  entities: Entity[];
  count: number;
}

/**
 * Preview state passed from workspace to graph components.
 */
export interface PreviewState {
  isActive: boolean;
  sourceEntityId: string;
  sourcePosition: { x: number; y: number };
  /** Individual preview entities (when count <= threshold) */
  nodes: Entity[];
  /** Grouped by type (when count > threshold) */
  groups: PreviewGroup[];
}
```

**Step 3: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/features/workspace/const.ts src/features/workspace/types.ts
git commit -m "feat(preview): add preview constants and types"
```

---

## Task 2: Add Compact Variant to EntityCard

**Files:**
- Modify: `src/features/entity-card/components/entity-card.component.tsx`

**Step 1: Add variant prop and compact rendering**

Update the Props interface and component:

```typescript
interface Props {
  entity: Entity;
  /** Optional CSS classes to override default styles */
  className?: string;
  /** Optional click handler - behavior varies by context (search, graph, etc.) */
  onClick?: (entity: Entity) => void;
  /** Enable drag-and-drop functionality (default: true) */
  draggable?: boolean;
  /** Card variant: 'default' for full card, 'compact' for single row */
  variant?: 'default' | 'compact';
  /** Show action button on right side (for compact variant) */
  actionIcon?: React.ReactNode;
  /** Called when action button is clicked */
  onAction?: (entity: Entity) => void;
  /** Whether this entity is disabled (e.g., already in graph) */
  disabled?: boolean;
}
```

Update the component to handle compact variant:

```typescript
const EntityCardComponent = ({
  entity,
  className,
  onClick,
  draggable = true,
  variant = 'default',
  actionIcon,
  onAction,
  disabled = false
}: Props) => {
  const iconClass = getEntityIconClass(entity.type);
  const dragImageRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!draggable || disabled) return;
    // ... existing drag logic
  };

  const handleDragEnd = () => {
    draggingEntityId = null;
  };

  const handleClick = () => {
    if (!disabled) {
      onClick?.(entity);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onAction?.(entity);
    }
  };

  const iconSymbolId = entity.type in ENTITY_ICON_CONFIG ? entity.type : 'unknown';

  // Compact variant: single row with icon, name, and optional action
  if (variant === 'compact') {
    return (
      <>
        <div
          className={cn(
            'flex h-8 items-center gap-x-2 rounded px-2',
            disabled
              ? 'text-muted-foreground cursor-not-allowed opacity-50'
              : 'hover:bg-accent cursor-pointer',
            className
          )}
          onClick={handleClick}
          draggable={draggable && !disabled}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <i className={cn('flex-shrink-0 text-sm', iconClass)} />
          <span className="min-w-0 flex-1 truncate text-sm">{entity.labelNormalized}</span>
          {disabled ? (
            <i className="ri-check-line text-muted-foreground flex-shrink-0 text-sm" />
          ) : actionIcon ? (
            <button
              className="text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleAction}
            >
              {actionIcon}
            </button>
          ) : null}
        </div>

        {/* Hidden drag image */}
        {draggable && !disabled && (
          <div ref={dragImageRef} className="pointer-events-none fixed -top-[9999px] -left-[9999px]">
            <svg width="44" height="44">
              <rect x="2" y="2" width="40" height="40" rx="4" ry="4" fill={GRAPH_CONFIG.nodeColorSelected} stroke="white" strokeWidth="2" />
              <use href={`#entity-icon-${iconSymbolId}`} x="6" y="6" width="32" height="32" fill="white" />
            </svg>
          </div>
        )}
      </>
    );
  }

  // Default variant: existing card layout
  return (
    <>
      <Card
        className={cn('hover:bg-accent cursor-pointer overflow-hidden p-2', className)}
        onClick={handleClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Header: icon + name */}
        <div className="flex min-w-0 items-center gap-x-2 border-b pb-1">
          <i className={cn('text-muted-foreground flex-shrink-0 text-base', iconClass)} />
          <span className="min-w-0 truncate font-medium">{entity.labelNormalized}</span>
        </div>

        {/* Content area (for future details) */}
        <div className="min-h-12" />
      </Card>

      {/* Hidden drag image */}
      {draggable && (
        <div ref={dragImageRef} className="pointer-events-none fixed -top-[9999px] -left-[9999px]">
          <svg width="44" height="44">
            <rect x="2" y="2" width="40" height="40" rx="4" ry="4" fill={GRAPH_CONFIG.nodeColorSelected} stroke="white" strokeWidth="2" />
            <use href={`#entity-icon-${iconSymbolId}`} x="6" y="6" width="32" height="32" fill="white" />
          </svg>
        </div>
      )}
    </>
  );
};
```

**Step 2: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/entity-card/components/entity-card.component.tsx
git commit -m "feat(entity-card): add compact variant with action support"
```

---

## Task 3: Create useGraphPreview Hook

**Files:**
- Create: `src/features/workspace/hooks/useGraphPreview.ts`

**Step 1: Create the hook file**

```typescript
import { useState, useCallback, useMemo } from 'react';
import { useEntityQuery } from '@/features/entity-search/hooks/useEntityQuery';
import type { Entity } from '@/models/entity.model';
import type { PreviewState, PreviewGroup } from '../types';
import { PREVIEW_CONFIG } from '../const';

interface UseGraphPreviewOptions {
  /** Entities currently in the workspace graph */
  entitiesInGraph: Map<string, Entity>;
  /** Callback when an entity should be added to the graph */
  onAddEntity: (entity: Entity, position: { x: number; y: number }) => void;
}

interface UseGraphPreviewReturn {
  /** Current preview state (null if not active) */
  previewState: PreviewState | null;
  /** Whether preview is currently loading */
  isLoading: boolean;
  /** Handle Alt+Click on an entity node */
  handleAltClick: (entityId: string, position: { x: number; y: number }) => void;
  /** Add a preview entity to the graph */
  handleAddEntity: (entity: Entity) => void;
  /** Exit preview mode */
  handleExit: () => void;
  /** Source entity name (for toast display) */
  sourceEntityName: string | null;
}

/**
 * Hook to manage live 1-hop preview state.
 * Fetches related entities and determines display mode (individual vs grouped).
 */
export function useGraphPreview({ entitiesInGraph, onAddEntity }: UseGraphPreviewOptions): UseGraphPreviewReturn {
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [sourcePosition, setSourcePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch entity with related entities when preview is active
  const { data: entityData, isLoading } = useEntityQuery(activeEntityId ?? '', 'type');

  // Calculate preview state from fetched data
  const previewState = useMemo<PreviewState | null>(() => {
    if (!activeEntityId || !entityData?.relatedEntities) {
      return null;
    }

    // Flatten all related entities and filter out those already in graph
    const allRelated: Entity[] = [];
    for (const [, entities] of Object.entries(entityData.relatedEntities)) {
      for (const related of entities) {
        if (!entitiesInGraph.has(related.id)) {
          allRelated.push({
            id: related.id,
            labelNormalized: related.labelNormalized,
            type: related.type
          });
        }
      }
    }

    // Determine display mode based on count
    const totalCount = allRelated.length;

    if (totalCount === 0) {
      return {
        isActive: true,
        sourceEntityId: activeEntityId,
        sourcePosition,
        nodes: [],
        groups: []
      };
    }

    if (totalCount <= PREVIEW_CONFIG.threshold) {
      // Individual nodes mode
      return {
        isActive: true,
        sourceEntityId: activeEntityId,
        sourcePosition,
        nodes: allRelated,
        groups: []
      };
    }

    // Grouped mode - group by entity type
    const groupedByType: Record<string, Entity[]> = {};
    for (const entity of allRelated) {
      if (!groupedByType[entity.type]) {
        groupedByType[entity.type] = [];
      }
      groupedByType[entity.type].push(entity);
    }

    const groups: PreviewGroup[] = Object.entries(groupedByType).map(([entityType, entities]) => ({
      entityType,
      entities,
      count: entities.length
    }));

    return {
      isActive: true,
      sourceEntityId: activeEntityId,
      sourcePosition,
      nodes: [],
      groups
    };
  }, [activeEntityId, entityData, entitiesInGraph, sourcePosition]);

  const handleAltClick = useCallback((entityId: string, position: { x: number; y: number }) => {
    if (activeEntityId === entityId) {
      // Toggle off if clicking same entity
      setActiveEntityId(null);
    } else {
      setActiveEntityId(entityId);
      setSourcePosition(position);
    }
  }, [activeEntityId]);

  const handleAddEntity = useCallback((entity: Entity) => {
    // Calculate position near source (simple offset for now, can enhance later)
    const angle = Math.random() * Math.PI * 2;
    const distance = PREVIEW_CONFIG.previewDistance;
    const position = {
      x: sourcePosition.x + Math.cos(angle) * distance,
      y: sourcePosition.y + Math.sin(angle) * distance
    };
    onAddEntity(entity, position);
  }, [sourcePosition, onAddEntity]);

  const handleExit = useCallback(() => {
    setActiveEntityId(null);
  }, []);

  const sourceEntityName = useMemo(() => {
    if (!activeEntityId) return null;
    const entity = entitiesInGraph.get(activeEntityId);
    return entity?.labelNormalized ?? null;
  }, [activeEntityId, entitiesInGraph]);

  return {
    previewState,
    isLoading,
    handleAltClick,
    handleAddEntity,
    handleExit,
    sourceEntityName
  };
}
```

**Step 2: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/workspace/hooks/useGraphPreview.ts
git commit -m "feat(preview): add useGraphPreview hook for state management"
```

---

## Task 4: Create Preview Node Component (SVG)

**Files:**
- Create: `src/features/workspace/components/graph-preview-node.component.tsx`

**Step 1: Create stateless preview node component**

```typescript
'use client';

import { useState } from 'react';
import type { Entity } from '@/models/entity.model';
import { GRAPH_CONFIG, PREVIEW_CONFIG } from '../const';
import { ENTITY_ICON_CONFIG } from '@/const';

interface Props {
  entity: Entity;
  position: { x: number; y: number };
  sourcePosition: { x: number; y: number };
  onAdd: (entity: Entity) => void;
}

/**
 * Stateless SVG preview node with dashed border.
 * Shows + icon on hover for adding to graph.
 */
const GraphPreviewNodeComponent = ({ entity, position, sourcePosition, onAdd }: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const iconSymbolId = entity.type in ENTITY_ICON_CONFIG ? entity.type : 'unknown';
  const nodeRadius = GRAPH_CONFIG.nodeRadius;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(entity);
  };

  return (
    <g>
      {/* Dashed connecting line to source */}
      <line
        x1={sourcePosition.x}
        y1={sourcePosition.y}
        x2={position.x}
        y2={position.y}
        stroke={PREVIEW_CONFIG.borderColor}
        strokeWidth={1.5}
        strokeDasharray={PREVIEW_CONFIG.lineDash}
        opacity={PREVIEW_CONFIG.nodeOpacity}
      />

      {/* Node group */}
      <g
        transform={`translate(${position.x}, ${position.y})`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Node square with dashed border */}
        <rect
          x={-nodeRadius}
          y={-nodeRadius}
          width={nodeRadius * 2}
          height={nodeRadius * 2}
          rx={4}
          ry={4}
          fill={GRAPH_CONFIG.nodeColor}
          fillOpacity={PREVIEW_CONFIG.nodeOpacity}
          stroke={isHovered ? GRAPH_CONFIG.nodeColorSelected : PREVIEW_CONFIG.borderColor}
          strokeWidth={2}
          strokeDasharray={isHovered ? 'none' : PREVIEW_CONFIG.lineDash}
        />

        {/* Entity icon or + icon on hover */}
        {isHovered ? (
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={24}
            fontWeight="bold"
          >
            +
          </text>
        ) : (
          <use
            href={`#entity-icon-${iconSymbolId}`}
            x={-GRAPH_CONFIG.iconSize / 2}
            y={-GRAPH_CONFIG.iconSize / 2}
            width={GRAPH_CONFIG.iconSize}
            height={GRAPH_CONFIG.iconSize}
            fill="white"
            opacity={PREVIEW_CONFIG.nodeOpacity}
          />
        )}

        {/* Label below node */}
        <text
          y={nodeRadius + 14}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          opacity={PREVIEW_CONFIG.nodeOpacity * 0.9}
        >
          {entity.labelNormalized.length > 15
            ? entity.labelNormalized.slice(0, 15) + '...'
            : entity.labelNormalized}
        </text>
      </g>
    </g>
  );
};

export default GraphPreviewNodeComponent;
```

**Step 2: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/workspace/components/graph-preview-node.component.tsx
git commit -m "feat(preview): add GraphPreviewNode SVG component"
```

---

## Task 5: Create Preview Group Component (SVG Circle)

**Files:**
- Create: `src/features/workspace/components/graph-preview-group.component.tsx`

**Step 1: Create stateless preview group component**

```typescript
'use client';

import { useState } from 'react';
import { GRAPH_CONFIG, PREVIEW_CONFIG } from '../const';
import { ENTITY_ICON_CONFIG } from '@/const';

interface Props {
  entityType: string;
  count: number;
  position: { x: number; y: number };
  sourcePosition: { x: number; y: number };
  onClick: () => void;
}

/**
 * Stateless SVG grouped preview node (circle shape).
 * Shows entity type icon with count badge.
 */
const GraphPreviewGroupComponent = ({ entityType, count, position, sourcePosition, onClick }: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const iconSymbolId = entityType in ENTITY_ICON_CONFIG ? entityType : 'unknown';
  const nodeRadius = GRAPH_CONFIG.nodeRadius;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <g>
      {/* Dashed connecting line to source */}
      <line
        x1={sourcePosition.x}
        y1={sourcePosition.y}
        x2={position.x}
        y2={position.y}
        stroke={PREVIEW_CONFIG.borderColor}
        strokeWidth={1.5}
        strokeDasharray={PREVIEW_CONFIG.lineDash}
        opacity={PREVIEW_CONFIG.nodeOpacity}
      />

      {/* Node group */}
      <g
        transform={`translate(${position.x}, ${position.y})`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Circle node (distinct from square regular nodes) */}
        <circle
          r={nodeRadius}
          fill={GRAPH_CONFIG.nodeColor}
          fillOpacity={PREVIEW_CONFIG.nodeOpacity}
          stroke={isHovered ? GRAPH_CONFIG.nodeColorSelected : PREVIEW_CONFIG.borderColor}
          strokeWidth={2}
          strokeDasharray={isHovered ? 'none' : PREVIEW_CONFIG.lineDash}
        />

        {/* Entity type icon */}
        <use
          href={`#entity-icon-${iconSymbolId}`}
          x={-GRAPH_CONFIG.iconSize / 2 + 2}
          y={-GRAPH_CONFIG.iconSize / 2 + 2}
          width={GRAPH_CONFIG.iconSize - 4}
          height={GRAPH_CONFIG.iconSize - 4}
          fill="white"
          opacity={PREVIEW_CONFIG.nodeOpacity}
        />

        {/* Count badge (top-right) */}
        <g transform={`translate(${nodeRadius - 4}, ${-nodeRadius + 4})`}>
          <rect
            x={-12}
            y={-8}
            width={24}
            height={16}
            rx={8}
            fill={GRAPH_CONFIG.nodeColorSelected}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10}
            fontWeight="bold"
          >
            {count > 999 ? '999+' : count}
          </text>
        </g>

        {/* Label below node */}
        <text
          y={nodeRadius + 14}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          opacity={PREVIEW_CONFIG.nodeOpacity * 0.9}
        >
          {entityType}
        </text>
      </g>
    </g>
  );
};

export default GraphPreviewGroupComponent;
```

**Step 2: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/workspace/components/graph-preview-group.component.tsx
git commit -m "feat(preview): add GraphPreviewGroup SVG circle component"
```

---

## Task 6: Create Preview Popup Component

**Files:**
- Create: `src/features/workspace/components/graph-preview-popup.component.tsx`

**Step 1: Create paginated popup component**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EntityCardComponent from '@/features/entity-card/components/entity-card.component';
import type { Entity } from '@/models/entity.model';
import { getEntityIconClass } from '@/lib/utils';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface Props {
  entityType: string;
  entities: Entity[];
  entitiesInGraph: Set<string>;
  position: { x: number; y: number };
  onAdd: (entity: Entity) => void;
  onClose: () => void;
}

/**
 * Stateless popup showing paginated list of entities.
 * Uses compact EntityCard variant with hover-reveal add button.
 */
const GraphPreviewPopupComponent = ({
  entityType,
  entities,
  entitiesInGraph,
  position,
  onAdd,
  onClose
}: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const iconClass = getEntityIconClass(entityType);

  // Filter entities by search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(e => e.labelNormalized.toLowerCase().includes(query));
  }, [entities, searchQuery]);

  // Paginate
  const totalPages = Math.ceil(filteredEntities.length / PAGE_SIZE);
  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntities.slice(start, start + PAGE_SIZE);
  }, [filteredEntities, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleAdd = (entity: Entity) => {
    onAdd(entity);
  };

  return (
    <div
      className="bg-card border-border absolute z-50 w-72 rounded-lg border shadow-lg"
      style={{ left: position.x + 30, top: position.y - 100 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <i className={cn('text-muted-foreground', iconClass)} />
          <span className="font-medium">
            {entityType} ({entities.length})
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b px-3 py-2">
        <Input
          type="text"
          placeholder={`Search ${entityType.toLowerCase()}...`}
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Entity list */}
      <div className="max-h-64 overflow-y-auto">
        {paginatedEntities.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-sm">No entities found</div>
        ) : (
          <div className="p-1">
            {paginatedEntities.map(entity => {
              const isInGraph = entitiesInGraph.has(entity.id);
              return (
                <div key={entity.id} className="group">
                  <EntityCardComponent
                    entity={entity}
                    variant="compact"
                    draggable={!isInGraph}
                    disabled={isInGraph}
                    onClick={() => !isInGraph && handleAdd(entity)}
                    actionIcon={<i className="ri-add-line" />}
                    onAction={() => handleAdd(entity)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <i className="ri-arrow-left-s-line" />
          </Button>
          <span className="text-muted-foreground text-xs">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <i className="ri-arrow-right-s-line" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default GraphPreviewPopupComponent;
```

**Step 2: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/workspace/components/graph-preview-popup.component.tsx
git commit -m "feat(preview): add GraphPreviewPopup paginated list component"
```

---

## Task 7: Create Preview Layer Component

**Files:**
- Create: `src/features/workspace/components/graph-preview-layer.component.tsx`

**Step 1: Create orchestrating preview layer**

```typescript
'use client';

import { useState, useMemo } from 'react';
import type { Entity } from '@/models/entity.model';
import type { PreviewState, PreviewGroup } from '../types';
import { PREVIEW_CONFIG } from '../const';
import GraphPreviewNodeComponent from './graph-preview-node.component';
import GraphPreviewGroupComponent from './graph-preview-group.component';
import GraphPreviewPopupComponent from './graph-preview-popup.component';

interface Props {
  previewState: PreviewState;
  transform: { x: number; y: number; k: number };
  entitiesInGraph: Set<string>;
  onAddEntity: (entity: Entity) => void;
}

/**
 * Orchestrates preview rendering - either individual nodes or grouped circles.
 * Rendered as SVG group inside the main graph SVG.
 */
const GraphPreviewLayerComponent = ({ previewState, transform, entitiesInGraph, onAddEntity }: Props) => {
  const [openPopup, setOpenPopup] = useState<PreviewGroup | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate positions for preview nodes/groups in a radial layout
  const nodePositions = useMemo(() => {
    const items = previewState.nodes.length > 0 ? previewState.nodes : previewState.groups;
    const count = items.length;
    if (count === 0) return [];

    const { sourcePosition } = previewState;
    const distance = PREVIEW_CONFIG.previewDistance;

    return items.map((_, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2; // Start from top
      return {
        x: sourcePosition.x + Math.cos(angle) * distance,
        y: sourcePosition.y + Math.sin(angle) * distance
      };
    });
  }, [previewState]);

  const handleGroupClick = (group: PreviewGroup, position: { x: number; y: number }) => {
    // Convert SVG position to screen position for popup
    const screenX = position.x * transform.k + transform.x;
    const screenY = position.y * transform.k + transform.y;
    setPopupPosition({ x: screenX, y: screenY });
    setOpenPopup(group);
  };

  const handleClosePopup = () => {
    setOpenPopup(null);
  };

  const handleAddFromPopup = (entity: Entity) => {
    onAddEntity(entity);
  };

  return (
    <>
      {/* SVG elements rendered in graph coordinate space */}
      <g className="preview-layer">
        {/* Individual preview nodes */}
        {previewState.nodes.map((entity, index) => (
          <GraphPreviewNodeComponent
            key={entity.id}
            entity={entity}
            position={nodePositions[index]}
            sourcePosition={previewState.sourcePosition}
            onAdd={onAddEntity}
          />
        ))}

        {/* Grouped preview nodes */}
        {previewState.groups.map((group, index) => (
          <GraphPreviewGroupComponent
            key={group.entityType}
            entityType={group.entityType}
            count={group.count}
            position={nodePositions[index]}
            sourcePosition={previewState.sourcePosition}
            onClick={() => handleGroupClick(group, nodePositions[index])}
          />
        ))}
      </g>

      {/* Popup rendered outside SVG (React portal could be used for better positioning) */}
      {openPopup && (
        <GraphPreviewPopupComponent
          entityType={openPopup.entityType}
          entities={openPopup.entities}
          entitiesInGraph={entitiesInGraph}
          position={popupPosition}
          onAdd={handleAddFromPopup}
          onClose={handleClosePopup}
        />
      )}
    </>
  );
};

export default GraphPreviewLayerComponent;
```

**Step 2: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/workspace/components/graph-preview-layer.component.tsx
git commit -m "feat(preview): add GraphPreviewLayer orchestration component"
```

---

## Task 8: Integrate Preview into workspace-graph.component.tsx

**Files:**
- Modify: `src/features/workspace/components/workspace-graph.component.tsx`

**Step 1: Add preview props to interface**

Add to Props interface (around line 78):

```typescript
interface Props {
  // ... existing props ...
  /** Whether preview mode is active (disables conflicting interactions) */
  isPreviewActive?: boolean;
  /** Called when user Alt+Clicks on an entity node */
  onAltClick?: (entityId: string, position: { x: number; y: number }) => void;
}
```

**Step 2: Update component to receive preview props**

Add to destructuring (around line 106):

```typescript
const WorkspaceGraphComponent = ({
  // ... existing props ...
  isPreviewActive = false,
  onAltClick
}: Props) => {
```

**Step 3: Add Alt+Click detection to node click handler**

Update the node click handler (around line 622-638). Replace existing click handler:

```typescript
// Left-click on node: single select, ctrl+click toggle, or alt+click for preview
node.on('click', function (event: MouseEvent, d: WorkspaceGraphNode) {
  event.stopPropagation();

  // Alt+Click: trigger preview
  if (event.altKey && onAltClick) {
    onAltClick(d.id, { x: d.x ?? 0, y: d.y ?? 0 });
    return;
  }

  // If preview is active, ignore other clicks
  if (isPreviewActive) return;

  // Focus the editor group panel when clicking a node
  onFocusPanel?.();
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+click: toggle this node in/out of selection
    onToggleEntitySelection(d.id);
  } else {
    // Regular click: if node already selected, keep selection (allows multi-drag)
    // Otherwise, select only this node
    const isAlreadySelected = selectedEntityIdsRef.current.includes(d.id);
    if (!isAlreadySelected) {
      onSetSelectedEntityIds([d.id]);
    }
  }
});
```

**Step 4: Disable conflicting interactions when preview is active**

Update the drag handler to check isPreviewActive (around line 570):

```typescript
const drag = d3
  .drag<SVGGElement, WorkspaceGraphNode>()
  .on('start', function (event, d) {
    // Disable dragging during preview
    if (isPreviewActive) return;
    // ... rest of drag start logic
  })
  .on('drag', function (event, d) {
    if (isPreviewActive) return;
    // ... rest of drag logic
  })
  .on('end', function () {
    if (isPreviewActive) return;
    // ... rest of drag end logic
  });
```

Update mousedown handler for rectangle selection (around line 657):

```typescript
const handleMouseDown = (event: MouseEvent) => {
  // Disable rectangle selection during preview
  if (isPreviewActive) return;
  // ... rest of mousedown logic
};
```

Update double-click handler (around line 646):

```typescript
// Double-click on node: open entity detail popup (disabled during preview)
node.on('dblclick', function (event: MouseEvent, d: WorkspaceGraphNode) {
  if (isPreviewActive) return;
  event.preventDefault();
  event.stopPropagation();
  handleOpenPopupRef.current(d.id, d.x ?? 0, d.y ?? 0);
});
```

Update context menu handler (around line 641):

```typescript
// Right-click handler (disabled during preview)
node.on('contextmenu', function (event: MouseEvent, d: WorkspaceGraphNode) {
  if (isPreviewActive) return;
  event.preventDefault();
  onContextMenu(event, d.id);
});
```

**Step 5: Add isPreviewActive to useEffect dependencies**

Update the main useEffect dependencies array (around line 782):

```typescript
}, [
  data,
  dimensions,
  workspace,
  debouncedSave,
  onSetSelectedEntityIds,
  onToggleEntitySelection,
  onClearEntitySelection,
  onContextMenu,
  onFocusPanel,
  isPreviewActive,
  onAltClick
]);
```

**Step 6: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/features/workspace/components/workspace-graph.component.tsx
git commit -m "feat(preview): add Alt+Click detection and disable interactions during preview"
```

---

## Task 9: Integrate Preview into workspace.component.tsx

**Files:**
- Modify: `src/features/workspace/components/workspace.component.tsx`

**Step 1: Import preview hook and components**

Add imports at top:

```typescript
import { useGraphPreview } from '../hooks/useGraphPreview';
import GraphPreviewLayerComponent from './graph-preview-layer.component';
import { toast } from 'sonner';
```

**Step 2: Add preview hook and state**

Add after existing hooks (around line 43):

```typescript
// Preview mode state
const handleAddPreviewEntity = useCallback(
  (entity: Entity, position: { x: number; y: number }) => {
    handleAddEntity(entity.id, position);
  },
  [handleAddEntity]
);

const {
  previewState,
  isLoading: isPreviewLoading,
  handleAltClick: handlePreviewAltClick,
  handleAddEntity: handlePreviewAddEntity,
  handleExit: handlePreviewExit,
  sourceEntityName
} = useGraphPreview({
  entitiesInGraph: entityMap,
  onAddEntity: handleAddPreviewEntity
});

// Show persistent toast when preview is active
useEffect(() => {
  if (previewState?.isActive && sourceEntityName) {
    const toastId = toast.info(
      <div className="flex items-center gap-2">
        <i className="ri-eye-line" />
        <span>Live Preview: Showing connections for "{sourceEntityName}"</span>
      </div>,
      {
        duration: Infinity,
        action: {
          label: 'Dismiss',
          onClick: handlePreviewExit
        }
      }
    );
    return () => toast.dismiss(toastId);
  }
}, [previewState?.isActive, sourceEntityName, handlePreviewExit]);

// Handle Escape key to exit preview
useEffect(() => {
  if (!previewState?.isActive) return;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handlePreviewExit();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [previewState?.isActive, handlePreviewExit]);
```

**Step 3: Pass preview props to WorkspaceGraphComponent**

Update the WorkspaceGraphComponent render (around line 230):

```typescript
<WorkspaceGraphComponent
  workspace={workspace}
  entityMap={entityMap}
  selectedEntityIds={selectedEntityIds}
  onSetSelectedEntityIds={handleSetSelectedEntityIds}
  onToggleEntitySelection={handleToggleEntitySelection}
  onClearEntitySelection={() => {
    clearEntitySelection(workspaceId);
    // Also exit preview when clearing selection
    if (previewState?.isActive) {
      handlePreviewExit();
    }
  }}
  onSaveViewState={handleSaveViewState}
  onAddEntity={handleAddEntity}
  onContextMenu={handleContextMenu}
  onFocusPanel={handleFocusPanel}
  openPopups={openPopups}
  onOpenPopup={popup => openPopup(workspaceId, popup)}
  onClosePopup={popupId => closePopup(workspaceId, popupId)}
  onUpdatePopupPosition={(popupId, svgX, svgY) => updatePopupPosition(workspaceId, popupId, svgX, svgY)}
  isPreviewActive={previewState?.isActive ?? false}
  onAltClick={handlePreviewAltClick}
/>
```

**Step 4: Verify changes compile**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/features/workspace/components/workspace.component.tsx
git commit -m "feat(preview): integrate preview hook and toast in workspace component"
```

---

## Task 10: Update Seed Data for Testing

**Files:**
- Modify: `src/lib/mock-data/dummyData.json`

**Step 1: Create a script or manually update dummyData.json**

Add entities with names starting with A, B, C, Z and appropriate relationships:

- A entities: 5-10 relationships each
- B entities: 20-30 relationships each
- C entities: 30-49 relationships each
- Z entities: 100+ relationships each

This requires generating new mock data. Create a simple script:

**Create: `scripts/generate-mock-data.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const ENTITY_TYPES = ['Person', 'Organization'];
const PREDICATES = ['works_for', 'knows', 'manages', 'reports_to', 'collaborates_with'];

interface Entity {
  id: string;
  labelNormalized: string;
  type: string;
}

interface Relationship {
  sourceEntityId: string;
  relatedEntityId: string;
  predicate: string;
}

// Generate entities with specific prefixes
const entities: Entity[] = [];
const relationships: Relationship[] = [];

let entityId = 1;

// Helper to create entity
function createEntity(prefix: string, type: string): Entity {
  const id = `entity-${entityId++}`;
  return {
    id,
    labelNormalized: `${prefix} Entity ${entityId}`,
    type
  };
}

// Helper to create relationships between entities
function createRelationships(source: Entity, targets: Entity[]) {
  for (const target of targets) {
    relationships.push({
      sourceEntityId: source.id,
      relatedEntityId: target.id,
      predicate: PREDICATES[Math.floor(Math.random() * PREDICATES.length)]
    });
  }
}

// Create pool of entities to connect to
const entityPool: Entity[] = [];
for (let i = 0; i < 200; i++) {
  const type = ENTITY_TYPES[i % 2];
  const entity = createEntity('Pool', type);
  entities.push(entity);
  entityPool.push(entity);
}

// A entities: 5-10 relationships
for (let i = 0; i < 5; i++) {
  const entity = createEntity('Alpha', ENTITY_TYPES[i % 2]);
  entities.push(entity);
  const count = 5 + Math.floor(Math.random() * 6); // 5-10
  const targets = entityPool.slice(0, count);
  createRelationships(entity, targets);
}

// B entities: 20-30 relationships
for (let i = 0; i < 5; i++) {
  const entity = createEntity('Beta', ENTITY_TYPES[i % 2]);
  entities.push(entity);
  const count = 20 + Math.floor(Math.random() * 11); // 20-30
  const targets = entityPool.slice(0, count);
  createRelationships(entity, targets);
}

// C entities: 30-49 relationships
for (let i = 0; i < 5; i++) {
  const entity = createEntity('Charlie', ENTITY_TYPES[i % 2]);
  entities.push(entity);
  const count = 30 + Math.floor(Math.random() * 20); // 30-49
  const targets = entityPool.slice(0, count);
  createRelationships(entity, targets);
}

// Z entities: 100+ relationships
for (let i = 0; i < 5; i++) {
  const entity = createEntity('Zulu', ENTITY_TYPES[i % 2]);
  entities.push(entity);
  const count = 100 + Math.floor(Math.random() * 100); // 100-199
  const targets = entityPool.slice(0, Math.min(count, entityPool.length));
  createRelationships(entity, targets);
}

const data = { entities, relationships };

const outputPath = path.join(__dirname, '../src/lib/mock-data/dummyData.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`Generated ${entities.length} entities and ${relationships.length} relationships`);
```

**Step 2: Run script and update data**

Run: `npx ts-node scripts/generate-mock-data.ts`

Or manually update dummyData.json with the required structure.

**Step 3: Verify application works**

Run: `npm run dev`
Test in browser: Alt+Click on entities with different prefixes.

**Step 4: Commit**

```bash
git add src/lib/mock-data/dummyData.json scripts/generate-mock-data.ts
git commit -m "feat(mock-data): add entities with varying relationship counts for preview testing"
```

---

## Task 11: Integration Testing and Polish

**Files:**
- All preview-related files

**Step 1: Test all preview scenarios**

1. Alt+Click on entity with <50 relationships → see individual nodes
2. Alt+Click on entity with >50 relationships → see grouped circles
3. Click + on preview node → entity added to graph
4. Click grouped node → popup opens
5. Search in popup → list filters
6. Pagination in popup works
7. Already-in-graph entities show dimmed with checkmark
8. Escape key exits preview
9. Click empty canvas exits preview
10. Alt+Click same node exits preview
11. Toast shows and dismiss works
12. Zoom/pan still works during preview

**Step 2: Fix any issues found**

Address any bugs or visual issues discovered during testing.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(preview): complete live 1-hop preview implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add constants and types | const.ts, types.ts |
| 2 | Add compact EntityCard variant | entity-card.component.tsx |
| 3 | Create useGraphPreview hook | useGraphPreview.ts |
| 4 | Create preview node SVG | graph-preview-node.component.tsx |
| 5 | Create preview group SVG | graph-preview-group.component.tsx |
| 6 | Create preview popup | graph-preview-popup.component.tsx |
| 7 | Create preview layer | graph-preview-layer.component.tsx |
| 8 | Integrate into workspace-graph | workspace-graph.component.tsx |
| 9 | Integrate into workspace | workspace.component.tsx |
| 10 | Update seed data | dummyData.json |
| 11 | Integration testing | All files |
