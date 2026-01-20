import { Entity, toEntity } from './entity.model';
import { Relationship } from './relationship.model';
import { ViewPreference } from './view-preference.model';
import type { WorkspaceResponse } from './workspace-response.model';

export interface Workspace {
  id: string;
  name: string;
  entityList: Entity[];
  viewPreference: ViewPreference;
  relationshipList: Relationship[];
}

/**
 * Converts external API response to Workspace model.
 */
export function toWorkspace(response: WorkspaceResponse): Workspace {
  return {
    id: response.id,
    name: response.name,
    entityList: response.entityList.map(toEntity),
    relationshipList: response.relationshipList as Relationship[],
    viewPreference: {
      scale: 1,
      coordinate: {}
    }
  };
}