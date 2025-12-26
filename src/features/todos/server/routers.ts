import 'server-only';

/**
 * Todo Router
 *
 * ORPC procedure definitions for todo operations.
 * Validates input/output only - delegates business logic to services.
 */

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import { todoSchema } from '@/models/todo.model';
import * as todoService from '@/features/todos/server/services/todo.service';

const API_TODO_PREFIX = '/todos';
const tags = ['Todo'];

export const todoRouter = appProcedure.router({
  getAll: appProcedure
    .route({
      method: 'GET',
      path: API_TODO_PREFIX,
      summary: 'Get all todos',
      tags
    })
    .output(todoSchema.array())
    .handler(async () => {
      return todoService.getAllTodos();
    }),

  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Get todo by ID',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(todoSchema)
    .handler(async ({ input }) => {
      return todoService.getTodoById(input.id);
    }),

  create: appProcedure
    .route({
      method: 'POST',
      path: API_TODO_PREFIX,
      summary: 'Create a todo',
      tags
    })
    .input(z.object({ text: z.string() }))
    .output(todoSchema)
    .handler(async ({ input }) => {
      return todoService.createTodo(input.text);
    }),

  update: appProcedure
    .route({
      method: 'PUT',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Update a todo',
      tags
    })
    .input(todoSchema)
    .output(todoSchema)
    .handler(async ({ input }) => {
      const { id, ...updates } = input;
      return todoService.updateTodo(id, updates);
    }),

  delete: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Delete a todo',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      return todoService.deleteTodo(input.id);
    })
});
