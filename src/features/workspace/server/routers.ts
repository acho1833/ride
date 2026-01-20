import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { workspaceSchema } from '@/models/workspace.model';
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
    .handler(async ({ input }) => {
      return workspaceService.getWorkspaceById(input.id);
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
    .handler(async ({ input }) => {
      return workspaceService.addEntitiesToWorkspace(input.workspaceId, input.entityIds);
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
    .handler(async ({ input }) => {
      return workspaceService.removeEntitiesFromWorkspace(input.workspaceId, input.entityIds);
    })
});
