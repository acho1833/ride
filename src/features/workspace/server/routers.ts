import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { workspaceSchema } from '@/models/workspace.model';
import { workspaceViewStateSchema, workspaceViewStateInputSchema } from '@/models/workspace-view-state.model';
import { entitySchema } from '@/models/entity.model';
import { relationshipSchema } from '@/models/relationship.model';
import * as workspaceService from './services/workspace.service';

const API_WORKSPACE_PREFIX = '/workspaces';
const tags = ['Workspace'];

export const workspaceRouter = appProcedure.router({
  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_WORKSPACE_PREFIX}/:id`,
      summary: 'Get workspace by ID',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(workspaceSchema)
    .handler(async ({ input, context }) => {
      return workspaceService.getWorkspaceById(input.id, context.sid);
    }),

  saveViewState: appProcedure
    .route({
      method: 'PUT',
      path: `${API_WORKSPACE_PREFIX}/:workspaceId/view-state`,
      summary: 'Save workspace view state',
      tags
    })
    .input(workspaceViewStateInputSchema)
    .output(workspaceViewStateSchema)
    .handler(async ({ input, context }) => {
      return workspaceService.saveViewState(input, context.sid);
    }),

  delete: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_WORKSPACE_PREFIX}/:id`,
      summary: 'Delete workspace',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ input, context }) => {
      return workspaceService.deleteWorkspace(input.id, context.sid);
    }),

  addEntities: appProcedure
    .route({
      method: 'POST',
      path: `${API_WORKSPACE_PREFIX}/:workspaceId/entities`,
      summary: 'Add entities to workspace',
      tags
    })
    .input(z.object({ workspaceId: z.string(), entityIds: z.array(z.string()) }))
    .output(workspaceSchema)
    .handler(async ({ input, context }) => {
      return workspaceService.addEntitiesToWorkspace(input.workspaceId, input.entityIds, context.sid);
    }),

  removeEntities: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_WORKSPACE_PREFIX}/:workspaceId/entities`,
      summary: 'Remove entities from workspace',
      tags
    })
    .input(z.object({ workspaceId: z.string(), entityIds: z.array(z.string()) }))
    .output(workspaceSchema)
    .handler(async ({ input, context }) => {
      return workspaceService.removeEntitiesFromWorkspace(input.workspaceId, input.entityIds, context.sid);
    }),

  createWithData: appProcedure
    .route({
      method: 'POST',
      path: `${API_WORKSPACE_PREFIX}/:workspaceId/data`,
      summary: 'Create workspace with entities and relationships',
      tags
    })
    .input(
      z.object({
        workspaceId: z.string(),
        entities: z.array(entitySchema),
        relationships: z.array(relationshipSchema)
      })
    )
    .output(workspaceSchema)
    .handler(async ({ input, context }) => {
      return workspaceService.createWorkspaceWithData(input.workspaceId, input.entities, input.relationships, context.sid);
    })
});
