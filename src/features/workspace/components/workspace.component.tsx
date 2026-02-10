'use client';

/**
 * Workspace Component
 *
 * Data fetching wrapper for workspace graph.
 * Retrieves workspace data by workspaceId and passes to graph component.
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useWorkspaceQuery } from '../hooks/useWorkspaceQuery';
import { useWorkspaceViewStateMutation } from '../hooks/useWorkspaceViewStateMutation';
import { useWorkspaceAddEntitiesMutation } from '../hooks/useWorkspaceAddEntitiesMutation';
import { useWorkspaceRemoveEntitiesMutation } from '../hooks/useWorkspaceRemoveEntitiesMutation';
import {
  useSelectedEntityIds,
  useOpenPopups,
  useWorkspaceGraphActions,
  useHiddenEntityTypes,
  useHiddenPredicates,
  useIsFilterPanelOpen,
  useHiddenFilterCount
} from '@/stores/workspace-graph/workspace-graph.selector';
import { useIsEditorGroupFocused, useUiActions } from '@/stores/ui/ui.selector';
import { useTypeTabActions } from '@/stores/type-tabs/type-tabs.selector';
import type { DashboardData } from '@/stores/type-tabs/type-tabs.store';
import { useHighlightedEntityIds, usePatternSearchActions } from '@/stores/pattern-search/pattern-search.selector';
import { toast } from 'sonner';
import WorkspaceGraphComponent from './workspace-graph.component';
import WorkspaceContextMenuComponent from './workspace-context-menu.component';
import DeleteEntitiesDialogComponent from './delete-entities-dialog.component';
import GraphPreviewPopupComponent from './graph-preview-popup.component';
import WorkspaceToolbarComponent from './workspace-toolbar.component';
import WorkspaceFilterPanelComponent from './workspace-filter-panel.component';
import { useGraphPreview } from '../hooks/useGraphPreview';
import type { WorkspaceViewStateInput } from '@/models/workspace-view-state.model';
import type { Entity } from '@/models/entity.model';
import type { PreviewGroup } from '../types';
import { isEditableElement } from '@/lib/utils';

interface Props {
  /** The workspaceId to fetch and display */
  workspaceId: string;
  /** The editor group ID this workspace is rendered in */
  groupId: string;
}

const WorkspaceComponent = ({ workspaceId, groupId }: Props) => {
  const { data: workspace, isPending, isError, error } = useWorkspaceQuery(workspaceId);
  const { mutate: saveViewState } = useWorkspaceViewStateMutation();
  const { mutate: addEntities } = useWorkspaceAddEntitiesMutation();
  const { mutate: removeEntities, isPending: isDeleting } = useWorkspaceRemoveEntitiesMutation();
  const selectedEntityIds = useSelectedEntityIds(workspaceId);
  const openPopups = useOpenPopups(workspaceId);
  const {
    setSelectedEntityIds,
    toggleEntitySelection,
    clearEntitySelection,
    openPopup,
    closePopup,
    updatePopupPosition,
    toggleEntityTypeVisibility,
    togglePredicateVisibility,
    resetFilters,
    setFilterPanelOpen
  } = useWorkspaceGraphActions();
  const hiddenEntityTypes = useHiddenEntityTypes(workspaceId);
  const hiddenPredicates = useHiddenPredicates(workspaceId);
  const isFilterPanelOpen = useIsFilterPanelOpen(workspaceId);
  const hiddenFilterCount = useHiddenFilterCount(workspaceId);
  const isEditorGroupFocused = useIsEditorGroupFocused(groupId);
  const { setFocusedPanel, toggleToolbar } = useUiActions();
  const { openChartTab } = useTypeTabActions();
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Preview mode state
  const [previewPopup, setPreviewPopup] = useState<{ group: PreviewGroup; position: { x: number; y: number } } | null>(null);

  // Clear selection state when this workspace component unmounts (tab closed)
  useEffect(() => {
    return () => {
      clearEntitySelection(workspaceId);
    };
  }, [workspaceId, clearEntitySelection]);

  // Clear selection when this editor group loses focus
  useEffect(() => {
    if (!isEditorGroupFocused) {
      clearEntitySelection(workspaceId);
    }
  }, [isEditorGroupFocused, workspaceId, clearEntitySelection]);

  // Handle keyboard shortcuts: Ctrl+A (select all), Delete/Backspace (delete selected)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (isEditableElement(event)) return;

      // Only act when this editor group is focused
      if (!isEditorGroupFocused) return;

      // Ctrl+A / Cmd+A — select all entities
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && workspace) {
        event.preventDefault();
        const allIds = workspace.entityList.map(e => e.id);
        setSelectedEntityIds(workspaceId, allIds);
        return;
      }

      // Delete or Backspace — open delete confirmation dialog
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (deleteDialogOpen) return;
        if (selectedEntityIds.length === 0) return;
        event.preventDefault();
        setDeleteDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditorGroupFocused, selectedEntityIds.length, deleteDialogOpen, workspace, workspaceId, setSelectedEntityIds]);

  // Create entity map for O(1) lookups
  const entityMap = useMemo<Map<string, Entity>>(() => {
    if (!workspace) return new Map();
    return new Map(workspace.entityList.map(e => [e.id, e]));
  }, [workspace]);

  // Derive available entity types and predicates from workspace data
  const entityTypes = useMemo<string[]>(() => {
    if (!workspace) return [];
    return [...new Set(workspace.entityList.map(e => e.type))].sort();
  }, [workspace]);

  const predicates = useMemo<string[]>(() => {
    if (!workspace) return [];
    return [...new Set(workspace.relationshipList.map(r => r.predicate))].sort();
  }, [workspace]);

  // Compute filtered entity map
  const filteredEntityMap = useMemo<Map<string, Entity>>(() => {
    if (!workspace || hiddenEntityTypes.length === 0) return entityMap;
    const hiddenSet = new Set(hiddenEntityTypes);
    const map = new Map<string, Entity>();
    for (const [id, entity] of entityMap) {
      if (!hiddenSet.has(entity.type)) {
        map.set(id, entity);
      }
    }
    return map;
  }, [workspace, entityMap, hiddenEntityTypes]);

  // Preview mode hook
  const handlePreviewAddEntity = useCallback(
    (entity: Entity, position: { x: number; y: number }) => {
      // Add entity to workspace at the specified position
      addEntities(
        { workspaceId, entityIds: [entity.id] },
        {
          onSuccess: () => {
            setSelectedEntityIds(workspaceId, [entity.id]);
          }
        }
      );

      // Save position immediately
      const currentPositions = workspace?.viewState?.entityPositions ?? {};
      saveViewState({
        workspaceId,
        scale: workspace?.viewState?.scale ?? 1,
        panX: workspace?.viewState?.panX ?? 0,
        panY: workspace?.viewState?.panY ?? 0,
        entityPositions: {
          ...currentPositions,
          [entity.id]: position
        }
      });
    },
    [addEntities, saveViewState, workspaceId, workspace?.viewState, setSelectedEntityIds]
  );

  const {
    previewState,
    handleAltClick,
    handleAddEntity: handlePreviewAdd,
    handleExit: handlePreviewExit,
    sourceEntityNames,
    sourceCount
  } = useGraphPreview({
    entitiesInGraph: entityMap,
    onAddEntity: handlePreviewAddEntity
  });

  // Show persistent toast when preview is active
  useEffect(() => {
    if (!previewState?.isActive || sourceCount === 0) return;

    const message =
      sourceCount === 1
        ? `Live Preview: Showing connections for "${sourceEntityNames[0]}"`
        : `Live Preview: Showing connections for ${sourceCount} entities`;

    const toastId = toast.info(message, {
      duration: Infinity,
      action: {
        label: 'Dismiss',
        onClick: () => handlePreviewExit()
      }
    });

    return () => {
      toast.dismiss(toastId);
    };
  }, [previewState?.isActive, sourceEntityNames, sourceCount, handlePreviewExit]);

  // Handle Escape key to exit preview
  useEffect(() => {
    if (!previewState?.isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handlePreviewExit();
        setPreviewPopup(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewState?.isActive, handlePreviewExit]);

  // Listen to highlighted entity IDs from pattern search and select matching entities
  const highlightedEntityIds = useHighlightedEntityIds();
  const { setHighlightedEntityIds } = usePatternSearchActions();
  useEffect(() => {
    if (!highlightedEntityIds || highlightedEntityIds.length === 0) return;
    // Filter to only entities that exist in this workspace
    const matchingIds = highlightedEntityIds.filter(id => entityMap.has(id));
    if (matchingIds.length > 0) {
      setSelectedEntityIds(workspaceId, matchingIds);
    }
  }, [highlightedEntityIds, entityMap, workspaceId, setSelectedEntityIds]);

  // Wrap selection handlers to clear pattern search highlights only when user selects different entities
  const handleSetSelectedEntityIds = useCallback(
    (ids: string[]) => {
      // Only clear highlights if user is selecting different entities than the highlighted ones
      const highlightSet = new Set(highlightedEntityIds);
      const isSameAsHighlighted = ids.length === highlightedEntityIds.length && ids.every(id => highlightSet.has(id));
      if (!isSameAsHighlighted) {
        setHighlightedEntityIds([]);
      }
      setSelectedEntityIds(workspaceId, ids);
    },
    [workspaceId, setSelectedEntityIds, setHighlightedEntityIds, highlightedEntityIds]
  );

  const handleToggleEntitySelection = useCallback(
    (id: string) => {
      // Toggle always changes the selection, so clear highlights
      setHighlightedEntityIds([]);
      toggleEntitySelection(workspaceId, id);
    },
    [workspaceId, toggleEntitySelection, setHighlightedEntityIds]
  );

  const handleSaveViewState = useCallback(
    (input: Omit<WorkspaceViewStateInput, 'workspaceId'>) => {
      saveViewState({ ...input, workspaceId });
    },
    [saveViewState, workspaceId]
  );

  const handleAddEntity = useCallback(
    (entityId: string, position: { x: number; y: number }) => {
      // Add entity to workspace, then select it after success
      addEntities(
        { workspaceId, entityIds: [entityId] },
        {
          onSuccess: () => {
            // Select the entity after it's been added and graph re-renders
            setSelectedEntityIds(workspaceId, [entityId]);
          }
        }
      );

      // Save position immediately so it appears at the drop location
      const currentPositions = workspace?.viewState?.entityPositions ?? {};
      saveViewState({
        workspaceId,
        scale: workspace?.viewState?.scale ?? 1,
        panX: workspace?.viewState?.panX ?? 0,
        panY: workspace?.viewState?.panY ?? 0,
        entityPositions: {
          ...currentPositions,
          [entityId]: position
        }
      });
    },
    [addEntities, saveViewState, workspaceId, workspace?.viewState, setSelectedEntityIds]
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent, entityId?: string) => {
      // If right-clicked on entity, handle selection
      if (entityId) {
        if (event.ctrlKey || event.metaKey) {
          // Ctrl+right-click: add to multi-selection (like ctrl+left-click)
          toggleEntitySelection(workspaceId, entityId);
        } else {
          // Regular right-click: single-select
          setSelectedEntityIds(workspaceId, [entityId]);
        }
      }
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
    },
    [workspaceId, setSelectedEntityIds, toggleEntitySelection]
  );

  const handleToggleFilterPanel = useCallback(() => {
    setFilterPanelOpen(workspaceId, !isFilterPanelOpen);
  }, [workspaceId, isFilterPanelOpen, setFilterPanelOpen]);

  const handleOpenDashboard = useCallback(() => {
    const tab = {
      id: `dashboard-${workspaceId}`,
      name: `Dashboard: ${workspace?.name ?? 'Workspace'}`,
      type: 'DASHBOARD' as const,
      data: { workspaceId, workspaceName: workspace?.name ?? 'Workspace' } satisfies DashboardData
    };
    openChartTab(tab);
    toggleToolbar('bottom', 'CHARTS');
  }, [workspaceId, workspace?.name, openChartTab, toggleToolbar]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleFocusPanel = useCallback(() => {
    setFocusedPanel(`editor-group-${groupId}`);
  }, [setFocusedPanel, groupId]);

  const handleDeleteConfirm = useCallback(() => {
    removeEntities(
      { workspaceId, entityIds: selectedEntityIds },
      {
        onSuccess: () => {
          clearEntitySelection(workspaceId);
          setDeleteDialogOpen(false);
        }
      }
    );
  }, [workspaceId, selectedEntityIds, removeEntities, clearEntitySelection]);

  // Preview group click handler - opens popup with entity list
  // Note: screenPosition is already in screen coords from D3 handler
  // We store it directly since preview popup doesn't need to persist across pan/zoom
  // (preview mode exits on pan/zoom interactions anyway)
  const handlePreviewGroupClick = useCallback(
    (groupType: string, screenPosition: { x: number; y: number }) => {
      const group = previewState?.groups.find(g => g.entityType === groupType);
      if (group) {
        setPreviewPopup({ group, position: screenPosition });
      }
    },
    [previewState?.groups]
  );

  // Handle adding entity from preview popup
  const handlePreviewPopupAdd = useCallback(
    (entity: Entity) => {
      handlePreviewAdd(entity);
    },
    [handlePreviewAdd]
  );

  // Handle closing preview popup
  const handlePreviewPopupClose = useCallback(() => {
    setPreviewPopup(null);
  }, []);

  // Handle preview popup drag end (convert screen coords to track position)
  const handlePreviewPopupDragEnd = useCallback((containerX: number, containerY: number) => {
    setPreviewPopup(prev => (prev ? { ...prev, position: { x: containerX, y: containerY } } : null));
  }, []);

  // Clear selection handler that also exits preview
  const handleClearEntitySelection = useCallback(() => {
    clearEntitySelection(workspaceId);
    handlePreviewExit();
    setPreviewPopup(null);
  }, [workspaceId, clearEntitySelection, handlePreviewExit]);

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading workspace...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-destructive">Error loading workspace: {error?.message ?? 'Unknown error'}</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Workspace not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WorkspaceToolbarComponent
        hiddenCount={hiddenFilterCount}
        isFilterPanelOpen={isFilterPanelOpen}
        onToggleFilterPanel={handleToggleFilterPanel}
        onOpenDashboard={handleOpenDashboard}
      />
      <div className="relative min-h-0 flex-1">
        <WorkspaceGraphComponent
          workspace={workspace}
          entityMap={entityMap}
          hiddenEntityTypes={hiddenEntityTypes}
          hiddenPredicates={hiddenPredicates}
          selectedEntityIds={selectedEntityIds}
          onSetSelectedEntityIds={handleSetSelectedEntityIds}
          onToggleEntitySelection={handleToggleEntitySelection}
          onClearEntitySelection={handleClearEntitySelection}
          onSaveViewState={handleSaveViewState}
          onAddEntity={handleAddEntity}
          onContextMenu={handleContextMenu}
          onFocusPanel={handleFocusPanel}
          openPopups={openPopups}
          onOpenPopup={popup => openPopup(workspaceId, popup)}
          onClosePopup={popupId => closePopup(workspaceId, popupId)}
          onUpdatePopupPosition={(popupId, svgX, svgY) => updatePopupPosition(workspaceId, popupId, svgX, svgY)}
          previewState={previewState}
          onAltClick={handleAltClick}
          onPreviewAddEntity={(entityId, position) => {
            const entity = previewState?.nodes.find(e => e.id === entityId);
            if (entity) handlePreviewAddEntity(entity, position);
          }}
          onPreviewGroupClick={handlePreviewGroupClick}
        />
        {isFilterPanelOpen && (
          <WorkspaceFilterPanelComponent
            entityTypes={entityTypes}
            predicates={predicates}
            hiddenEntityTypes={hiddenEntityTypes}
            hiddenPredicates={hiddenPredicates}
            onToggleEntityType={type => toggleEntityTypeVisibility(workspaceId, type)}
            onTogglePredicate={predicate => togglePredicateVisibility(workspaceId, predicate)}
            onReset={() => resetFilters(workspaceId)}
            onClose={() => setFilterPanelOpen(workspaceId, false)}
          />
        )}
        <WorkspaceContextMenuComponent
          position={contextMenuPosition}
          onClose={handleContextMenuClose}
          selectedEntityCount={selectedEntityIds.length}
          onDelete={handleDeleteClick}
        />
        <DeleteEntitiesDialogComponent
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityCount={selectedEntityIds.length}
          onConfirm={handleDeleteConfirm}
          isPending={isDeleting}
        />
        {previewPopup && (
          <GraphPreviewPopupComponent
            entityType={previewPopup.group.entityType}
            entities={previewPopup.group.entities}
            entitiesInGraph={new Set(filteredEntityMap.keys())}
            x={previewPopup.position.x}
            y={previewPopup.position.y}
            onAdd={handlePreviewPopupAdd}
            onClose={handlePreviewPopupClose}
            onDragEnd={handlePreviewPopupDragEnd}
          />
        )}
      </div>
    </div>
  );
};

export default WorkspaceComponent;
