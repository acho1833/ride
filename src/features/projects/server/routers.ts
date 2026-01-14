import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { projectSchema, projectCreateSchema, projectUpdateSchema } from '@/models/project.model';
import * as projectService from '@/features/projects/server/services/project.service';

const API_PROJECT_PREFIX = '/projects';
const tags = ['Project'];

export const projectRouter = appProcedure.router({
  getAll: appProcedure
    .route({
      method: 'GET',
      path: API_PROJECT_PREFIX,
      summary: 'Get all projects for current user',
      tags
    })
    .output(projectSchema.array())
    .handler(async ({ context }) => {
      return projectService.getAllProjects(context.sid);
    }),

  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_PROJECT_PREFIX}/:id`,
      summary: 'Get project by ID',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(projectSchema)
    .handler(async ({ context, input }) => {
      return projectService.getProjectById(context.sid, input.id);
    }),

  create: appProcedure
    .route({
      method: 'POST',
      path: API_PROJECT_PREFIX,
      summary: 'Create a new project',
      tags
    })
    .input(projectCreateSchema)
    .output(projectSchema)
    .handler(async ({ context, input }) => {
      return projectService.createProject(context.sid, input);
    }),

  update: appProcedure
    .route({
      method: 'PUT',
      path: `${API_PROJECT_PREFIX}/:id`,
      summary: 'Update a project',
      tags
    })
    .input(projectUpdateSchema)
    .output(projectSchema)
    .handler(async ({ context, input }) => {
      return projectService.updateProject(context.sid, input);
    }),

  delete: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_PROJECT_PREFIX}/:id`,
      summary: 'Delete a project',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      return projectService.deleteProject(context.sid, input.id);
    }),

  open: appProcedure
    .route({
      method: 'POST',
      path: `${API_PROJECT_PREFIX}/:id/open`,
      summary: 'Open a project (set as active and update lastOpenedAt)',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(projectSchema)
    .handler(async ({ context, input }) => {
      return projectService.openProject(context.sid, input.id);
    })
});
