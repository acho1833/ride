import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

  // Keep a ref to activeEntityId for stable callback access
  const activeEntityIdRef = useRef(activeEntityId);
  useEffect(() => {
    activeEntityIdRef.current = activeEntityId;
  }, [activeEntityId]);

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

  const handleAltClick = useCallback(
    (entityId: string, position: { x: number; y: number }) => {
      const currentActiveId = activeEntityIdRef.current;
      console.log('[useGraphPreview] handleAltClick called', { entityId, position, currentActiveId });
      if (currentActiveId === entityId) {
        // Toggle off if clicking same entity
        console.log('[useGraphPreview] toggling off preview');
        setActiveEntityId(null);
      } else {
        console.log('[useGraphPreview] activating preview for', entityId);
        setActiveEntityId(entityId);
        setSourcePosition(position);
      }
    },
    [] // Empty deps - uses ref for current value
  );

  const handleAddEntity = useCallback(
    (entity: Entity) => {
      // Calculate position near source (simple offset for now)
      const angle = Math.random() * Math.PI * 2;
      const distance = PREVIEW_CONFIG.previewDistance;
      const position = {
        x: sourcePosition.x + Math.cos(angle) * distance,
        y: sourcePosition.y + Math.sin(angle) * distance
      };
      onAddEntity(entity, position);
    },
    [sourcePosition, onAddEntity]
  );

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
