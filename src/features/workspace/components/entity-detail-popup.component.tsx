'use client';

/**
 * Entity Detail Popup Component
 *
 * Entity-specific popup that wraps DetailPopupComponent with:
 * - Entity header (icon + name)
 * - Entity body (type info)
 * - Expand button toolbar (adds related entities to workspace)
 *
 * Fetches entity details via API to get relatedEntities for expand functionality.
 * Shows entity info immediately from workspace data while API loads.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Waypoints, Expand } from 'lucide-react';
import { useEntityQuery } from '@/features/entity-search/hooks/useEntityQuery';
import { useWorkspaceAddEntitiesMutation } from '@/features/workspace/hooks/useWorkspaceAddEntitiesMutation';
import DetailPopupComponent from './detail-popup.component';
import { EntityDetailHeader, EntityDetailBody } from './entity-detail-content.component';
import { usePatternSearchActions } from '@/stores/pattern-search/pattern-search.selector';
import { useToolbarMode, useUiActions } from '@/stores/ui/ui.selector';
import type { Entity } from '@/models/entity.model';
import type { Workspace } from '@/models/workspace.model';

interface Props {
  /** Entity data from workspace (for immediate display) */
  entity: Entity;
  /** Screen x coordinate for popup position */
  x: number;
  /** Screen y coordinate for popup position */
  y: number;
  /** Workspace data (for checking existing entities) */
  workspace: Workspace;
  /** Called when close button is clicked */
  onClose: () => void;
  /** Called when popup is dragged to new position */
  onDragEnd: (containerX: number, containerY: number) => void;
  /** Called to select entities (used for auto-selecting expanded entities) */
  onSetSelectedEntityIds: (ids: string[]) => void;
}

const EntityDetailPopupComponent = ({ entity, x, y, workspace, onClose, onDragEnd, onSetSelectedEntityIds }: Props) => {
  // Fetch entity details with related entities (grouped by type by default)
  const { data: entityDetails } = useEntityQuery(entity.id);

  // Mutation for adding entities to workspace
  const { mutate: addEntities, isPending } = useWorkspaceAddEntitiesMutation();

  // Pattern search actions and toolbar state
  const { addNodeFromEntity, setSearchMode } = usePatternSearchActions();
  const { toggleToolbar } = useUiActions();
  const toolbar = useToolbarMode();

  // Calculate which related entities are not yet in workspace
  const existingEntityIds = useMemo(() => new Set(workspace.entityList.map(e => e.id)), [workspace.entityList]);

  // Extract all related entity IDs from the grouped structure
  // relatedEntities is Record<string, RelatedEntity[]> - flatten all arrays and get IDs
  const relatedEntities = entityDetails?.relatedEntities ?? {};
  const allRelatedIds = Object.values(relatedEntities)
    .flat()
    .map(e => e.id);
  const newEntityIds = allRelatedIds.filter(id => !existingEntityIds.has(id));
  const isExpandDisabled = isPending || newEntityIds.length === 0;

  const handleExpand = () => {
    if (newEntityIds.length > 0) {
      addEntities(
        { workspaceId: workspace.id, entityIds: newEntityIds },
        {
          onSuccess: () => {
            // Auto-select the newly added entities
            onSetSelectedEntityIds(newEntityIds);
          }
        }
      );
    }
  };

  const handleAddToPattern = () => {
    // Open entity search panel if not already showing
    if (toolbar.left !== 'ENTITY_SEARCH') {
      toggleToolbar('left', 'ENTITY_SEARCH');
    }
    // Switch to advanced mode
    setSearchMode('advanced');
    // Create pattern node from entity
    addNodeFromEntity(entity.type, entity.labelNormalized);
  };

  return (
    <DetailPopupComponent
      x={x}
      y={y}
      onClose={onClose}
      onDragEnd={onDragEnd}
      header={<EntityDetailHeader entity={entity} />}
      toolbar={
        <>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleAddToPattern} title="Add to pattern search">
            <Waypoints className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleExpand}
            disabled={isExpandDisabled}
            title="Add related entities"
          >
            <Expand className="h-3 w-3" />
          </Button>
        </>
      }
    >
      <EntityDetailBody entity={entity} />
    </DetailPopupComponent>
  );
};

export default EntityDetailPopupComponent;
