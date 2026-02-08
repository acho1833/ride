import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc/orpc';
import type { Entity } from '@/models/entity.model';
import type { PreviewState, PreviewNode, PreviewGroup, PreviewLink } from '../types';
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
  /** Handle Alt+Click on an entity node (graph or preview) */
  handleAltClick: (entityId: string, position: { x: number; y: number }) => void;
  /** Add a preview entity to the graph */
  handleAddEntity: (entity: Entity) => void;
  /** Exit preview mode */
  handleExit: () => void;
  /** Source entity names (for toast display) */
  sourceEntityNames: string[];
  /** Number of active sources */
  sourceCount: number;
}

/**
 * Hook to manage multi-source preview state.
 * Fetches related entities for multiple sources and aggregates them.
 * Supports expanding preview from both graph nodes and preview nodes.
 */
export function useGraphPreview({ entitiesInGraph, onAddEntity }: UseGraphPreviewOptions): UseGraphPreviewReturn {
  // Track multiple source entities with their positions
  const [sources, setSources] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Keep a ref for stable callback access
  const sourcesRef = useRef(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  // Get array of source IDs for queries
  const sourceIds = useMemo(() => Array.from(sources.keys()), [sources]);

  // Fetch entity data for all sources in parallel
  const queries = useQueries({
    queries: sourceIds.map(id => ({
      ...orpc.entity.getById.queryOptions({ input: { id, groupRelatedEntitiesBy: 'type' } }),
      enabled: !!id
    }))
  });

  // Check if any query is loading
  const isLoading = queries.some(q => q.isLoading);

  // Calculate preview state from all fetched data
  const previewState = useMemo<PreviewState | null>(() => {
    if (sources.size === 0) {
      return null;
    }

    // Build source positions map
    const sourcePositions: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of sources) {
      sourcePositions[id] = pos;
    }

    // Collect all preview nodes and track which source they came from
    const allPreviewNodes: PreviewNode[] = [];
    const seenPreviewIds = new Set<string>();
    const previewLinks: PreviewLink[] = [];

    // Process sources in REVERSE order (newest first) so that when user clicks
    // a preview node, its related entities are attributed to it, not to older sources.
    //
    // KEY INSIGHT: Only process sources that have finished loading. This prevents
    // the race condition where older sources "claim" entities before the newest
    // source's query completes.
    const reversedSourceIds = [...sourceIds].reverse();

    for (const sourceId of reversedSourceIds) {
      const index = sourceIds.indexOf(sourceId);
      const queryResult = queries[index];

      // Skip sources still loading - their entities will be processed once loaded
      if (queryResult?.isLoading) {
        continue;
      }

      const entityData = queryResult?.data;
      if (!entityData?.relatedEntities) {
        continue;
      }

      // Process all related entities from this source
      for (const [, entities] of Object.entries(entityData.relatedEntities)) {
        for (const related of entities) {
          // Skip if already in graph, already a source, or already seen
          if (entitiesInGraph.has(related.id) || sources.has(related.id) || seenPreviewIds.has(related.id)) {
            continue;
          }

          // Add as preview node attributed to this source
          seenPreviewIds.add(related.id);
          allPreviewNodes.push({
            id: related.id,
            labelNormalized: related.labelNormalized,
            type: related.type,
            sourceEntityId: sourceId
          });
        }
      }
    }

    // Note: Links between preview nodes and graph entities would require extra API calls
    // to fetch each preview node's relationships. Skipping for now - only source->preview links shown.

    // Determine display mode based on count
    const totalCount = allPreviewNodes.length;

    if (totalCount === 0) {
      return {
        isActive: true,
        sourceEntityIds: sourceIds,
        sourcePositions,
        nodes: [],
        groups: [],
        links: []
      };
    }

    if (totalCount <= PREVIEW_CONFIG.threshold) {
      // Individual nodes mode
      return {
        isActive: true,
        sourceEntityIds: sourceIds,
        sourcePositions,
        nodes: allPreviewNodes,
        groups: [],
        links: previewLinks
      };
    }

    // Grouped mode - group by entity type, keeping source info
    // For groups, we need to track which source each entity came from
    const groupedByType: Record<string, PreviewNode[]> = {};
    for (const node of allPreviewNodes) {
      if (!groupedByType[node.type]) {
        groupedByType[node.type] = [];
      }
      groupedByType[node.type].push(node);
    }

    // Create groups - use the first entity's source as the group source
    // (groups may contain entities from multiple sources)
    const groups: PreviewGroup[] = Object.entries(groupedByType).map(([entityType, entities]) => ({
      entityType,
      entities,
      count: entities.length,
      sourceEntityId: entities[0].sourceEntityId
    }));

    return {
      isActive: true,
      sourceEntityIds: sourceIds,
      sourcePositions,
      nodes: [],
      groups,
      links: previewLinks
    };
  }, [sources, sourceIds, queries, entitiesInGraph]);

  const handleAltClick = useCallback(
    (entityId: string, position: { x: number; y: number }) => {
      setSources(prev => {
        const next = new Map(prev);
        if (next.has(entityId)) {
          // Toggle off - remove this source
          next.delete(entityId);
        } else {
          // Add new source with its position
          next.set(entityId, position);
        }
        return next;
      });
    },
    []
  );

  const handleAddEntity = useCallback(
    (entity: Entity) => {
      // Find the source position for this entity
      // Use the entity's sourceEntityId if it's a PreviewNode, otherwise use first source
      const previewNode = previewState?.nodes.find(n => n.id === entity.id);
      const sourceId = previewNode?.sourceEntityId ?? sourceIds[0];
      const sourcePos = sources.get(sourceId) ?? { x: 0, y: 0 };

      // Calculate position near source
      const angle = Math.random() * Math.PI * 2;
      const distance = PREVIEW_CONFIG.previewDistance;
      const position = {
        x: sourcePos.x + Math.cos(angle) * distance,
        y: sourcePos.y + Math.sin(angle) * distance
      };
      onAddEntity(entity, position);
    },
    [sources, sourceIds, previewState?.nodes, onAddEntity]
  );

  const handleExit = useCallback(() => {
    setSources(new Map());
  }, []);

  const sourceEntityNames = useMemo(() => {
    return sourceIds
      .map(id => entitiesInGraph.get(id)?.labelNormalized)
      .filter((name): name is string => !!name);
  }, [sourceIds, entitiesInGraph]);

  return {
    previewState,
    isLoading,
    handleAltClick,
    handleAddEntity,
    handleExit,
    sourceEntityNames,
    sourceCount: sources.size
  };
}
