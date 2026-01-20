import { z } from 'zod';
import { Entity, entitySchema, toEntity } from './entity.model';
import { Relationship, relationshipSchema } from './relationship.model';
import { ViewPreference, viewPreferenceSchema } from './view-preference.model';
import type { WorkspaceResponse } from './workspace-response.model';

export interface Workspace {
  id: string;
  name: string;
  entityList: Entity[];
  viewPreference: ViewPreference;
  relationshipList: Relationship[];
}

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  entityList: entitySchema.array(),
  viewPreference: viewPreferenceSchema,
  relationshipList: relationshipSchema.array()
});

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
